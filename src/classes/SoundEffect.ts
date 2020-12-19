import { exec } from 'child_process'
import * as path from 'path'

export default class SoundEffect {
    private path: string;

    constructor(fileName: string) {
        console.log(process.cwd())
        this.path = path.join(__dirname, "..", "sounds", fileName)
    }

    public play() {
        let command: string;

        if (process.platform === "win32") {
            const vlcPath = path.join(__dirname, "..", "bin", "windows", "vlc.exe")
            command = `${vlcPath} --play-and-exit -I dummy --dummy-quiet --no-video-deco ${this.path}`
        } else {
            command = `cvlc --play-and-exit --gain 3 ${this.path}`
        }

        exec(command, error => {
            if (error) {
                console.error(error)
                return
            }
        })
    }
}