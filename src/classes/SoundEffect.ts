import { exec } from 'child_process'
import * as path from 'path'

export default class SoundEffect {
    private path: string;

    constructor(fileName: string) {
        console.log(process.cwd())
        this.path = path.join(__dirname, "..", "sounds", fileName)
    }

    public play() {
        exec(`cvlc --play-and-exit --gain 3 ${this.path}`, error => {
            if (error) {
                console.error(error)
                return
            }
        })
    }
}