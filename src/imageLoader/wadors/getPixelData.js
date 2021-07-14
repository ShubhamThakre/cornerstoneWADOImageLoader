import { xhrRequest } from '../internal/index.js';
import findIndexOfString from './findIndexOfString.js';



function findBoundary(header) {
  for (let i = 0; i < header.length; i++) {
    if (header[i].substr(0, 2) === '--') {
      return header[i];
    }
  }
}

function findContentType(header) {
  for (let i = 0; i < header.length; i++) {
    if (header[i].substr(0, 13) === 'Content-Type:') {
      return header[i].substr(13).trim();
    }
  }
}

function uint8ArrayToString(data, offset, length) {
  offset = offset || 0;
  length = length || data.length - offset;
  let str = '';

  for (let i = offset; i < offset + length; i++) {
    str += String.fromCharCode(data[i]);
  }

  return str;
}

async function getPixelData(uri, imageId, mediaType = 'application/octet-stream') {
  const headers = {
    accept: mediaType,
  };
  const cache = await caches.open('my-cache');


  return new Promise((resolve, reject) => {
    const loadPromise = xhrRequest(uri, imageId, headers);

    loadPromise.then(function (imageFrameAsArrayBuffer /* , xhr*/) {
      // request succeeded, Parse the multi-part mime response
      const response = new Uint8Array(imageFrameAsArrayBuffer);

      // First look for the multipart mime header
      const tokenIndex = findIndexOfString(response, '\r\n\r\n');


      if (tokenIndex === -1) {
        reject(new Error('invalid response - no multipart mime header'));
      }
      const header = uint8ArrayToString(response, 0, tokenIndex);
      // Now find the boundary  marker
      const split = header.split('\r\n');
      const boundary = findBoundary(split);

      if (!boundary) {
        reject(new Error('invalid response - no boundary marker'));
      }
      const offset = tokenIndex + 4; // skip over the \r\n\r\n

      // find the terminal boundary marker
      const endIndex = findIndexOfString(response, boundary, offset);

      if (endIndex === -1) {
        reject(new Error('invalid response - terminating boundary not found'));
      }

      // Remove \r\n from the length
      const length = endIndex - offset - 2;

      //addding comment
      console.log('shubham', {
        contentType: findContentType(split),
        imageFrame: {
          pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
        },
      }, 'uri', uri, 'imageId', imageId, 'headers', headers, 'imageFrameAsArrayBuffer', imageFrameAsArrayBuffer, typeof (imageFrameAsArrayBuffer));

      // const options = {
      //   headers: {
      //     'Content-Type': "multipart/related; type=\"application/octet-stream\""
      //   }
      // }
      // // const jsonResponse = new Response(new Uint8Array(imageFrameAsArrayBuffer, offset, length), options);
      // const jsonResponse = new Response({
      //   contentType: findContentType(split),
      //   imageFrame: {
      //     pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
      //   },
      // }, options);

      // const jsonResponse2 = new Response('{foo: "bar", some: {sadData :"dummy"} }')

      // cache.put(uri, imageFrameAsArrayBuffer)



      // return the info for this pixel data
      resolve({
        contentType: findContentType(split),
        imageFrame: {
          pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
        },
      });
    }, reject);
  });
}

export default getPixelData;
