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
  photoScale = 0.75;
  collage: any = []
  loadingStack: any = []
  rectList: any = []

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

    if (this.collage.length >= 13) {
      console.log("Photo limit reached")
      this.disableTranscription();

      this.matSnackBar.open('Collage full, remember to hit save!', '', {
        duration: 5000,
      })

      return;
    }

    this.loadingStack.push('a')
    this.matSnackBar.open(payload.text)
    if (this.speechMode === 'fast' && !payload.done) {
      this.getPhoto(payload.text.split(" ").pop())
    } else if(this.speechMode === 'accurate' && payload.done) {
      this.matSnackBar.open('Sentance confirmed: ' + payload.text)
      this.getPhoto(payload.text)
    } else if(payload.done) {
      this.loadingStack = []
    }
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

  resizeImg(img: any) {
    //for some reason, img.target.height auto scales when the img.target.width is scaled below
    img.target.width = img.target.width * this.photoScale;
  }

  doOverlap(coor: any) {

    if (this.rectList.length === 0) return false;

    let overlap = true;
    this.rectList.every( (item: any) => {
       
       // if rectangle has area 0, no overlap
       if (coor.tl.x == coor.br.x || coor.tl.y == coor.br.y || item.tl.x == item.br.x || item.tl.y == item.br.y) {
        overlap =  false;
        return true;
       }
       // If one rectangle is on left side of other
       if (coor.tl.x > item.br.x || item.tl.x > coor.br.x) {
        overlap =  false;
        return true;
       }
       // If one rectangle is above other (inverted for this app)
       if (coor.br.y < item.tl.y || item.br.y < coor.tl.y) {
        overlap =  false;
        return true;
       }
       console.log("overlap detected!");
       overlap = true;
       return false;
    });

    return overlap;
  }

  getPhoto(word: any) {
    this.httpClient.get(this.unsplashEndpoint + '&query=' + word).toPromise().then((photo: any) => {
      console.log(photo)

      var collageDiv = document.getElementById('collage')

      var collageDivHeight = collageDiv?.clientHeight
      var collageDivWidth = collageDiv?.clientWidth

      var samllImageWidth = 400
      var smallImageHeight = (samllImageWidth * (photo.height/photo.width))

      var heightMax = (collageDivHeight || 0) - smallImageHeight;
      var widthMax = (collageDivWidth || 0) - samllImageWidth;

      let top = Math.floor( Math.random() * (heightMax || 0) )
      let left = Math.floor( Math.random() * (widthMax || 0) )
      let coor: any;

      for (let i = 0; i < 75; i++) {
        coor = {
          tl: {x: left, y: top},
          br: {x: left + samllImageWidth, y: top + smallImageHeight}
        }

        if (this.doOverlap(coor) === false) break;
        
        top = Math.floor( Math.random() * (heightMax || 0) )
        left = Math.floor( Math.random() * (widthMax || 0) )
      }

      this.rectList.push(coor); 
      photo.top = top;
      photo.left = left;
      this.collage.push(photo);

      this.loadingStack.pop()
      this.loadingStack = []
      console.log(this.loadingStack)
      console.log('stop loader');
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
    this.client.off(`caption-message`, this.wordSpoken)
    this.client.leave(true)
    this.stream = null
    this.collage = []
    this.rectList = []
    this.matSnackBar.dismiss()
  }  
}
