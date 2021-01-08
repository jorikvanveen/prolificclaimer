import path from 'path'
import fs from 'fs/promises'

import fetch from 'node-fetch'
import puppeteer from 'puppeteer-extra'
import open from 'open'

import CommandLine from './classes/CommandLine'
import SoundEffect from './classes/SoundEffect'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())

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

let buildDir = __dirname;

if (process.pkg) {
    buildDir = path.join(process.argv[0], "..")
}

function getChromiumExecutable(): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
        if (process.pkg) {
            // Use bundled chromium with puppeteer
            if (process.platform === "linux") {
                resolve(path.join(buildDir, "chrome-linux", "chrome"))
            } else {
                resolve(path.join(buildDir, "chrome-win", "chrome.exe"))
            }
        } else {
            resolve(undefined)
        }
    })
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

function logIn(loginPage: any, username: string, password: string): Promise<void> {
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
        console.log('done')
        resolve()
    })
}

async function getProlificId(username:string, password:string): Promise<string> {
    const browser = await puppeteer.launch({
        executablePath: await getChromiumExecutable(),
        headless: false
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
            executablePath: await getChromiumExecutable(),
            headless: false
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
            
            console.log("Opening in browser")
            open("https://app.prolific.co/studies/" + study.id)

            const claimResponse = await fetch("https://www.prolific.co/api/v1/submissions/", {
                method: "POST",
                headers: {
                    'content-type': 'application/json',
                    'Authorization': token
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

