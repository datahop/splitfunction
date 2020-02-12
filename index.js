    /**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
//const Storage = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');
const splitFile = require('split-file');
//const request = require('request-promise');
const admin = require('firebase-admin');
//admin.initializeApp();
// Imports the Google Cloud client library

// Creates a client
//const storage = new Storage();
/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
const bucketName = 'datahopproject.appspot.com';
const srcFolder = 'testbed/';
const destFolder = 'video/';

var serviceAccount = require('../datahop-testbed-firebase-adminsdk-x7v7s-6397926fd5.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://datahop-testbed.firebaseio.com"
});
//admin.firestore.setLogFunction(console.log);

var db = admin.firestore();
var storage = admin.storage();

const settings = {/* your settings... */ timestampsInSnapshots: true};
db.settings(settings);

function fireAdd(results,item,video) {
    const metadata = results[0];
    //console.log('metadata=', metadata);
    //console.log('video=',video);
    //console.log('item=',item);

    fs.unlinkSync(item);
    //var fileName =  video.fileName+"."+i;
    var target = {
    title: video.title,
    desc: video.desc,
    url: metadata.mediaLink,
    user: video.user,
    time: video.time,
    chunk: metadata.name.replace(destFolder+video.fileName+".",''),
    chunkSize: metadata.size,
    fileName: video.fileName,
    totalChunk: video.totalChunk
    }
    //console.log("Video1 "+target);
    // Add a new document in collection "cities" with ID 'LA'
    db.collection('videos').add(target);
}

async function splitData(video)
{
// Downloads the file
console.log("File "+video.fileName+ " chunk "+video.chunkSize)
const destFilename = path.join(os.tmpdir(),video.fileName);
const options = {
  // The path to which the file should be downloaded, e.g. "./file.txt"
  destination: destFilename,
};
console.log("Destfilename "+destFilename);
console.log("Destfilename "+video.fileName);

await storage
  .bucket(bucketName)
  .file(srcFolder+video.fileName)
  .download(options);
  console.log("Video downloaded");

//const destFilename = path.join(os.tmpdir(),fileName);
splitFile.splitFileBySize(destFilename, video.chunkSize)
.then((names) => {
      //console.log(names);
      var i = 0;
      for (let item of names) {
          //console.log(item);
         // const targetTempFilePath = path.join(os.tmpdir(), item);
          i++;
          var dest = destFolder+video.fileName+"."+i
          //console.log(item + " "+ dest);
          //fireAdd(null,item,video)
          storage
            .bucket(bucketName)
            .upload(item, {
          destination: dest})
          .then(result =>{
            const file = result[0];
            return file.getMetadata()
         }).then(results => fireAdd(results,item,video)).catch(error => {
          console.error(error);
        });

      }

    })
.catch((err) => {
       console.log('Error: ', err);
     });
}


  db.collection("videos").where("chunk","==",0)
  .onSnapshot(function(querySnapshot) {
    querySnapshot.docChanges().forEach(function(change) {
     if (change.type === 'added') {
       console.log(change.doc.data().title,change.doc.data().chunk);
       let ref = db.collection('videos');
       let getDoc = ref.where('title', '==', change.doc.data().title).where('chunk', '==', '1').get()
          .then(snapshot => {
          if (snapshot.empty) {
            console.log('No matching documents.');
            splitData(change.doc.data()).catch(error => { console.log('caught', error.message); });
            return;
          }
        })
        .catch(err => {
          console.log('Error getting documents', err);
        });

     }
    });
  });
    /*querySnapshot.forEach(function(doc) {
      console.log(doc.data().title);
      db.collection("videos").where("title","==",doc.data().title).where("chunk","==",1).get()
      .then(function(doc){
        console.log(doc.data().title,doc.data().chunk);
        if (!doc.exists) {
          splitData(doc.data()).catch(error => { console.log('caught', error.message); });
        }
      });
    });
  });*/
