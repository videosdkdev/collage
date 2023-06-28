import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import ZoomVideo, { LiveTranscriptionLanguage } from '@zoom/videosdk'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

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
  loadingStack: any = []

  constructor(public httpClient: HttpClient, private matSnackBar: MatSnackBar) {

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
        this.joinSession(data.signature)
      } else {
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

      this.liveTranscriptionTranslation.setSpeakingLanguage(this.speakingLanguage).then((data: any) => {

        if(this.speakingLanguage !== 'en') {
          this.liveTranscriptionTranslation.setTranslationLanguage('en').then((data: any) => {

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
    // console.log('loader');
    // console.log(payload)
    // on fast mode, limit based on comma or period?
    // need to make a loader stack
    // stop listening?
    this.loadingStack.push('a')
    this.matSnackBar.open(payload.text)
    if (this.speechMode === 'fast' && !payload.done) {
      // console.log(payload)
      // console.log(`${payload.displayName} said: ${payload.text}`);
      // this.loadingStack.push('a')
      // take out the last word
      // console.log('last word only', payload.text.split(" ").pop())
      this.getPhoto(payload.text.split(" ").pop())
      
      // this.getPhoto(payload.text)
      // this.matSnackBar.open(payload.text)
    } else if(this.speechMode === 'accurate' && payload.done) {
      // console.log(payload)
      // console.log(`${payload.displayName} said: ${payload.text}`);
      // this.loadingStack.push('a')
      this.matSnackBar.open('Sentance confirmed: ' + payload.text)
      this.getPhoto(payload.text)
      // this.loadingStack = []

      // to make it look more accurate, always show caption?
    } else if(payload.done) {
      this.loadingStack = []
    }
    console.log(this.loadingStack)
  }

  disableTranscription() {
    this.stream.stopAudio()
    this.client.off(`caption-message`, this.wordSpoken)
    this.matSnackBar.dismiss()
  }

  onLanguageChange(language: any) {
    this.speakingLanguage = language.value
  }

  onSpeechModeChange(mode: any) {
    this.speechMode = mode.value
  }

  getPhoto(word: any) {
    this.httpClient.get(this.unsplashEndpoint + '&query=' + word).toPromise().then((photo: any) => {
      // console.log(photo)

      var collageDiv = document.getElementById('collage')

      var collageDivHeight = collageDiv?.clientHeight
      var collageDivWidth = collageDiv?.clientWidth

      var heightMax = (collageDivHeight || 0) - (400 * (photo.height/photo.width));
      var widthMax = (collageDivWidth || 0) - 400;

      photo.top = Math.floor( Math.random() * (heightMax || 0) )
      photo.left = Math.floor( Math.random() * (widthMax || 0) )

      this.collage.push(photo)

      // this.loadingStack.pop()
      this.loadingStack = []
      console.log(this.loadingStack)
      // console.log('stop loader');
    }).catch((error) => {
      console.log(error)
      this.loadingStack.pop()
    })
  }

  save() {
    this.matSnackBar.dismiss()
    html2canvas(document.getElementById("collage")!, {
      useCORS: true
    }).then((canvas) => {
      canvas.toBlob((blob: any) => {
        saveAs(blob, 'my-ai-photo-collage.jpg');
        this.matSnackBar.open('Collage succesfully downloaded!', '', {
          duration: 5000,
        })
      });
    })
  }

  leaveSession() {
    // this.stream.stopAudio() this happens auto magically I think
    this.client.off(`caption-message`, this.wordSpoken)
    this.client.leave(true)
    this.stream = null
    this.collage = []
    this.matSnackBar.dismiss()
  }  
}
