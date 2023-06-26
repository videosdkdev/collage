import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import ZoomVideo, { LiveTranscriptionLanguage } from '@zoom/videosdk'

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

  sessionName: string = (Math.floor(Math.random() * (1000 - 1) + 1)).toString()
  userName: string = 'test'
  sessionPasscode: string = 'test'
  role: any = 1

  speechMode = 'fast'
  speakingLanguage = 'en'
  languages = Object.keys(LiveTranscriptionLanguage).map(key => ({name: key, code: (LiveTranscriptionLanguage as any)[key]})).sort((a, b) => a.name.localeCompare(b.name))
  loading: boolean = false
  collage: any = []

  constructor(public httpClient: HttpClient) {

  }

  ngOnInit() {
  }

  getVideoSDKJWT() {
    this.loading = true
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
        this.loading = false
      }
    }).catch((error) => {
      console.log(error)
      this.loading = false
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
      this.loading = false

    }).catch((error: any) => {
      console.log(error)
      this.loading = false
    })
  }

  enableTranscription() {
    this.stream.startAudio()

    this.liveTranscriptionTranslation = this.client.getLiveTranscriptionClient()

    this.liveTranscriptionTranslation.startLiveTranscription().then((data: any) => {
      console.log(data)

      console.log(this.speakingLanguage)

      this.liveTranscriptionTranslation.setSpeakingLanguage(this.speakingLanguage).then((data: any) => {
        console.log(data)

        if(this.speakingLanguage !== 'en') {
          this.liveTranscriptionTranslation.setTranslationLanguage('en').then((data: any) => {
            console.log(data)

            this.client.on(`caption-message`, this.wordSpoken)
          }).catch((error: any) => {
            console.log(error)
          })
        } else {
          this.client.on(`caption-message`, this.wordSpoken)
        }
      }).catch((error: any) => {
        console.log(error)
      })

    }).catch((error: any) => {
      console.log(error)
    })

  }

  wordSpoken = (payload: any) => {

    // could do a loading on the image until done is passed
    console.log('loader');
    
    if (this.speechMode === 'fast' && !payload.done) {
      console.log(payload)
      console.log(`${payload.displayName} said: ${payload.text}`);
      this.getPhoto(payload.text)
    } else if(this.speechMode === 'accurate' && payload.done) {
      console.log(payload)
      console.log(`${payload.displayName} said: ${payload.text}`);
      this.getPhoto(payload.text)
    }
  }

  disableTranscription() {
    this.stream.stopAudio()
    this.client.off(`caption-message`, this.wordSpoken)
  }

  onLanguageChange(language: any) {
    console.log(language.value)

    this.speakingLanguage = language.value
  }

  onSpeechModeChange(mode: any) {
    console.log(mode.value)

    this.speechMode = mode.value
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
      console.log('stop loader');
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
