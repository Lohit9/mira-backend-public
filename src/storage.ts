import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream'

const storage = new Storage();

// you want to DISABLE automatic decompressive transcoding in order to:
// 
//     - reduce download latency
//     - reduce data transfer costs
// 
// we unzip on the server ourselves
//
// to do so, do the following: 
//      If the request for the object includes an Accept-Encoding: gzip header,
//      the object is served as-is in that specific request,
//      along with a Content-Encoding: gzip response header.
// 
//  https://cloud.google.com/storage/docs/transcoding


// include both "Content-Type: <type>" and "Content-Encoding: gzip" headers
// ex
//    Content-Type: text/plain
//    Content-Encoding: gzip

export async function downloadFileToMemory(fileName: string, bucketName: string): Promise<Buffer> {
  const [file] = await storage.bucket(bucketName).file(fileName).download({
   // TODO: 
   //   figure out why decompression isn't needed
   decompress: false,

   // FIXME: 
   // validation is failing at the moment and not sure why
   validation: false,
  });

  return file;
}

const uploadFile = ({ content, fileName }: File, bucketName: string) => {
  // const compressedContent = Bun.gzipSync(content);
  const file = storage.bucket(bucketName).file(fileName)
  const readStream = Readable.from(content)
  const writeStream = file.createWriteStream({
    resumable: true,
    gzip: true,
    metadata: {
      contentType: 'text/plain',
      contentEncoding: 'gzip',
    }
  })

  return new Promise((resolve, reject) => {
    readStream
      .pipe(writeStream)
      .on('finish', () => {
        resolve(undefined)
      })
      .on('error', (e) => {
        console.log(e)
        reject()
      })
  })
}

interface File {
  content: string
  fileName: string
}

export const uploadManyFiles = async (bucketName: string, files: File[]) => {
  await Promise.all(
    files.map((file) => uploadFile(file, bucketName))
  )
}
