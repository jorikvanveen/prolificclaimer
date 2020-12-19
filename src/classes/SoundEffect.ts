import child_process from 'child_process'
import * as path from 'path'

declare namespace NodeJS {
    export interface Process {
        pkg: boolean;
        [key: string]: any;
    }
}

declare const process: NodeJS.Process

let buildRoot:string;
if (process.pkg) {
    buildRoot = path.join(process.argv[0], "..")
} else {
    buildRoot = path.join(__dirname, "..")
}

export default class SoundEffect {
    private path: string;

    constructor(fileName: string) {
        console.log(process.cwd())

        
        this.path = path.join(buildRoot, "assets", "sounds", fileName)
    }

    public play() {
        let command: string;

        if (process.platform === "win32") {
            const vlcPath = path.join(buildRoot, "assets", "bin", "windows", "vlc.exe")
            command = `${vlcPath} --play-and-exit -I dummy --dummy-quiet --no-video-deco ${this.path}`
        } else {
            const vlcPath = path.join(buildRoot, "assets", "bin", "linux", "cvlc", "vlc")
            command = `${vlcPath} -I dummy --play-and-exit --gain 1 ${this.path}`
        }

        // const soundPlayer = child_process.spawn(command, [this.path])
        child_process.exec(command)
    }
}