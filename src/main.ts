import path from 'path'

import fetch from 'node-fetch'
import puppeteer from 'puppeteer'

import CommandLine from './classes/CommandLine'
import SoundEffect from './classes/SoundEffect'

declare namespace NodeJS {
    export interface Process {
        pkg: boolean;
        [key: string]: any;
    }
}

declare const process: NodeJS.Process

interface StudiesResponse {
    results: {
        id: string;
        name: string;
        description: string;
    }[]
}

const notifySound = new SoundEffect('./notify.mp3')
notifySound.play()

let chromiumExecutable: string = path.join(__dirname, "assets", "bin", "linux", "chromium", "chrome");

if (process.pkg) {
    const buildDir = path.join(process.argv[0], "..")

    if (process.platform === "win32") {
        chromiumExecutable = path.join(buildDir, "assets", "bin", "windows", "chromium", "chrome.exe")
    } else {
        chromiumExecutable = path.join(buildDir, "assets", "bin", "linux", "chromium", "chrome")
    }
}

function returnTimeout(timeout:number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout)
    })
}

async function fetchStudies(token: string) {
    const response = (await fetch("https://www.prolific.co/api/v1/studies/?current=1", {
        headers: {
            "Authorization": token
        }
    }))

    return response
}

function logIn(loginPage: puppeteer.Page, username: string, password: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        await loginPage.goto("https://www.prolific.co/auth/accounts/login/", { waitUntil: 'networkidle2' })
        await loginPage.evaluate(((username: string, password: string) => {
            const usernameInput = document.querySelector("#id_username")
            const passwordInput = document.querySelectorAll(".el-input__inner")[1]
            const loginButton = document.querySelector("#login")

            if (
                (usernameInput && passwordInput && loginButton) && 
                (
                    usernameInput instanceof HTMLInputElement && 
                    passwordInput instanceof HTMLInputElement && 
                    loginButton instanceof HTMLButtonElement
                )
            ) {
                usernameInput.value = username
                passwordInput.value = password
                loginButton.click()
                
            } else {
                reject(new Error("INPUT FIELDS NOT FOUND"))
            }
        }), username, password)
        resolve()
    })
}

async function getProlificId(username:string, password:string): Promise<string> {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromiumExecutable
    })
    
    const loginPage = await browser.newPage()

    await logIn(loginPage, username, password)

    console.log("Starting wait")

    await returnTimeout(1000)

    loginPage.waitForNavigation({waitUntil: "load"})

    console.log("Logged in")

    await loginPage.goto("https://app.prolific.co/account/general", {waitUntil: "networkidle2"})

    const prolificId = await loginPage.evaluate(() => {
        const prolificId = document.querySelector(".prolific-id").innerHTML.trim()

        return prolificId
    })

    browser.close()

    return prolificId
}   

function getToken(username: string, password: string): Promise<string> {
    return new Promise(async (resolve) => {
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: chromiumExecutable
        })
        const loginPage = await browser.newPage()

        loginPage.on('request', request => {
            if (request.url() === "https://www.prolific.co/api/v1/studies/?current=1") {
                const headers = request.headers()
                if (typeof headers.authorization === "string") {
                    resolve(headers.authorization)
                    browser.close()
                }
            }
        })

        logIn(loginPage, username, password)
    })
}

async function main() {
    const foundStudies: string[] = [];

    const username = await CommandLine.prompt("Prolific username: ", false)
    const password = await CommandLine.prompt("Prolific password: ", true)

    let token = await getToken(username, password)
    const prolificId = await getProlificId(username, password)


    setInterval(async () => {
        console.log("Fetching studies")

        const studiesResponse = await fetchStudies(token)

        if (studiesResponse.status !== 200) {
            token = await getToken(username, password)
            return
        }

        const studies = (await studiesResponse.json()) as StudiesResponse

        for (const study of studies.results) {
            if (foundStudies.includes(study.id)) continue
            console.log("Study epicly yes", study)
            notifySound.play()

            const claimResponse = await fetch("https://www.prolific.co/api/v1/submissions/", {
                method: "POST",
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    study_id: study.id,
                    participant_id: prolificId
                })
            })

            console.log("Autoclaim attempted", claimResponse.status)
            console.log("Autoclaim dump ", await claimResponse.json())

            foundStudies.push(study.id)
        }
    }, 5000)
}

main()

