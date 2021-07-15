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

function loadPixelData(uri, imageFrameAsArrayBuffer, cache) {
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

  // addding comment
  console.log('shubham', {
    contentType: findContentType(split),
    imageFrame: {
      pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
    },
  }, 'uri', uri, 'imageFrameAsArrayBuffer', imageFrameAsArrayBuffer);

  const options = {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  }

  // adding the arrayBUffer data to cache
  const jsonRes = new Response(imageFrameAsArrayBuffer, options)
  cache.put(uri, jsonRes)

  return {
    contentType: findContentType(split),
    imageFrame: {
      pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
    },
  }
}

async function getPixelData(uri, imageId, mediaType = 'application/octet-stream') {
  const headers = {
    accept: mediaType,
  };
  const cache = await caches.open('my-cache');

  // caches.open('my-cache')
  //   .then(cache => {
  //     cache.match('https://api-qa.quantx.cloud/studies/2.16.840.1.113786.1.982.8.706647296.796/series/1.3.12.2.1107.5.2.33.37426.30000015070219112348400000161/instance/1.3.12.2.1107.5.2.33.37426.30000015070219112348400000163/frames/1')
  //       .then(res =>{
  //         console.log('my response',res.arrayBuffer().then(a => console.log('aa', a, new Uint8Array(a))))
  //       })
  //   })

  const cacheData = await cache.match(uri);
  console.log(`cacheData`, cacheData)

  return new Promise(async (resolve, reject) => {
    if (cacheData) {
      console.log('inside if');
      cacheData.arrayBuffer().then(buffer => {
        console.log(buffer)
        // load the pixel data from loadPixelData function
        const pixelData = loadPixelData(uri, buffer, cache)
        console.log(pixelData)
        // return the info for this pixel data
        resolve(pixelData);
      }, reject);
    } else {
      console.log('outside if');
      const loadPromise = xhrRequest(uri, imageId, headers);

      loadPromise.then(function (imageFrameAsArrayBuffer /* , xhr*/) {
        // load the pixel data from loadPixelData function
        const pixelData = loadPixelData(uri, imageFrameAsArrayBuffer, cache)

        // return the info for this pixel data
        resolve(pixelData);
      }, reject);
    }
  });
}

export default getPixelData;
