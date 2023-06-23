import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import ZoomVideo from '@zoom/videosdk'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  authEndpoint = 'https://or116ttpz8.execute-api.us-west-1.amazonaws.com/default/videosdk'
  unsplashEndpoint = 'https://api.unsplash.com/photos/random?client_id=LKJoHrk3vnjorWUowT5YrhESk6G5O2HnkA4Qg3QD0V0'

  client = ZoomVideo.createClient()
  stream: any = null
  liveTranscriptionTranslation: any = null

  sessionName: string = 'test'
  userName: string = 'test'
  sessionPasscode: string = 'test'
  role: any = 1

  collage: any = []

  constructor(public httpClient: HttpClient) {

  }

  ngOnInit() {
    
  }

  getVideoSDKJWT() {
    this.client.init('en-US', 'CDN')
    this.httpClient.post(this.authEndpoint, JSON.stringify({
      sessionName: this.sessionName,
      role: this.role,
    })).toPromise().then((data: any) => {
      if(data.signature) {
        console.log(data.signature)
        this.joinSession(data.signature)
      } else {
        console.log(data)
      }
    }).catch((error) => {
      console.log(error)
    })
  }

  joinSession(videoSDKJWT: any) {
    // join
    // enable LTT
    // take complete sentance / word and search.
    // option for other language?
    // button to stop LTT
    // button to save as photo
    // button to upload as virutal background?

    this.client.join(this.sessionName, videoSDKJWT, this.userName, this.sessionPasscode).then((data: any) => {

      this.stream = this.client.getMediaStream()

    }).catch((error: any) => {
      console.log(error)
    })
  }

  enableTranscription() {
    this.stream.startAudio()

    this.liveTranscriptionTranslation = this.client.getLiveTranscriptionClient()

    this.liveTranscriptionTranslation.startLiveTranscription()

    this.client.on(`caption-message`, this.wordSpoken)
  }

  wordSpoken = (payload: any) => {
    console.log(payload)
      console.log(`${payload.displayName} said: ${payload.text}`);

      if(payload.done) {
        // complete sentance takes a bit longer
        // this.getPhoto(payload.text)
      } else {
        // this will be faster, maybe delimit based on ,
        this.getPhoto(payload.text)
      }
  }

  disableTranscription() {
    this.stream.stopAudio()
    this.client.off(`caption-message`, this.wordSpoken)
  }

  getPhoto(word: any) {
    this.httpClient.get(this.unsplashEndpoint + '&query=' + word).toPromise().then((photo: any) => {
      console.log(photo)

      var collageDiv = document.getElementById('collage')

      var collageDivHeight = collageDiv?.clientHeight
      var collageDivWidth = collageDiv?.clientWidth

      var heightMax = (collageDivHeight || 0) - (400 * (photo.height/photo.width));
      var widthMax = (collageDivWidth || 0) - 400;

      photo.top = Math.floor( Math.random() * (heightMax || 0) )
      photo.left = Math.floor( Math.random() * (widthMax || 0) )

      this.collage.push(photo)
    }).catch((error) => {
      console.log(error)
    })
  }

  save() {
    console.log('save me')
  }

  leaveSession() {
    this.stream.stopAudio()
    this.client.off(`caption-message`, this.wordSpoken)
    this.client.leave(true)
    this.stream = null
    this.collage = []
  }  
}
