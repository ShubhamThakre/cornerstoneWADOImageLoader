import findIndexOfString from './findIndexOfString.js';
import { xhrRequest } from '../internal/index.js';

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

function loadPixelData (uri, imageFrameAsArrayBuffer, cache) {
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

  const options = {
    headers: {
      'Content-Type': 'application/octet-stream'
    },
  };

  // adding the arrayBUffer data to cache
  const jsonRes = new Response(imageFrameAsArrayBuffer, options);
  cache.put(uri, jsonRes);

  return {
    contentType: findContentType(split),
    imageFrame: {
      pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
    },
  }
};

async function getPixelData(uri, imageId, mediaType = 'application/octet-stream'){
  const headers = {
    accept: mediaType,
  };
  const cache = await caches.open('my-cache');

  const cacheData = await cache.match(uri);

  return new Promise((resolve, reject) => {
    if (cacheData) {
      cacheData.arrayBuffer().then(buffer => {

        // load the pixel data from loadPixelData function
        const pixelData = loadPixelData(uri, buffer, cache);

        // return the info for this pixel data
        resolve(pixelData);
      }, reject);
    } else {
      const loadPromise = xhrRequest(uri, imageId, headers);

      loadPromise.then(function (imageFrameAsArrayBuffer /* , xhr*/){
        // load the pixel data from loadPixelData function
        const pixelData = loadPixelData(uri, imageFrameAsArrayBuffer, cache);

        // return the info for this pixel data
        resolve(pixelData);
      }, reject);
    }
  });
}

export default getPixelData;
