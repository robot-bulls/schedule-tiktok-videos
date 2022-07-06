//Libraries
//var request = require('sync-request'),
//    res1, res2, ucomp, vcomp;
//const cheerio = require('cheerio');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

//Tiktok

var number_of_videos_per_day = 8; //number of videos per day and number of videos in a folder
var number_of_videos_uploaded = 0; //starts at 0-7
var current_day = 1; //starts at 1
var folder_path = __dirname +"/videos/";


var schedule = process.env.UPLOAD_HOURS;
var schedule_u = schedule;
var random_minutes = process.env.UPLOAD_MINUTES;

var username = process.env.TIKTOK_USERNAME;
var password = process.env.TIKTOK_PASSWORD;


async function upload(page) {
    
    //get name of videos on tiktok account
    await page.goto("https://www.tiktok.com/@"+username, {waitUntil: 'load', timeout: 12000});
    await page.setDefaultNavigationTimeout(12000); 
    
    var number_of_uploaded_videos;
    var uploaded_videos = [];
    await page.waitForSelector(".tiktok-x6y88p-DivItemContainerV2");
    await page.evaluate((number_of_uploaded_videos, uploaded_videos) => {
        number_of_uploaded_videos = document.querySelector("[data-e2e='user-post-item-list']").getElementsByClassName("tiktok-x6y88p-DivItemContainerV2").length;
        
        for (var i = 0; i < number_of_uploaded_videos; i++) {
            uploaded_videos.push(document.querySelector("[data-e2e='user-post-item-list']").getElementsByClassName("tiktok-x6y88p-DivItemContainerV2")[i].getElementsByClassName("tiktok-1okfv2l-DivTagCardDesc-StyledDivTagCardDescV2")[0].textContent);
        }
        
        return [number_of_uploaded_videos, uploaded_videos];
    }, number_of_uploaded_videos, uploaded_videos).then((x) => {
        number_of_uploaded_videos = x[0];
        uploaded_videos = x[1];
    }, number_of_uploaded_videos, uploaded_videos);
    
    console.log("number_of_uploaded_videos = " + number_of_uploaded_videos);
//    console.log("uploaded_videos = " + uploaded_videos);
    
    
    //get name and path of current video
    var current_video;
//    const testFolder = daily_folder_path+'/day'+current_day+'/';
    var file_names = [];
    fs.readdirSync(folder_path).forEach(file => {
        file_names.push(file);
    });
    
    console.log("file_names = "+file_names);
    var file_names_beautified = [];
    
    for (var i = 0; i < file_names.length; i++) {
        file_names_beautified.push(file_names[i]);
        file_names_beautified[i] = file_names_beautified[i].substring(0, file_names_beautified[i].length-4);
//        file_names_beautified[i] = file_names_beautified[i].replace(/[0-9]/g, '');
        file_names_beautified[i] = file_names_beautified[i].substring(5);
//        first3_chars = first3_chars.replace(/[0-9]/g, '');
//        file_names_beautified[i] = first3_chars+file_names_beautified[i];
    }
    
    console.log("file_names_beautified = "+file_names_beautified);
    
    var namesToDeleteSet = new Set(uploaded_videos);
    const file_names_final = file_names_beautified.filter((name) => {
      return !namesToDeleteSet.has(name);
    });

    console.log("namesToDeleteSet = "+namesToDeleteSet);
    console.log("file_names_final = "+file_names_final);
    
    current_video = file_names_final[0];
    console.log("Video: "+current_video);
    
    var current_path;
    
    for(var i = 0; i < file_names.length; i++) {
        if(file_names[i].indexOf(current_video) != -1) {
            current_path = file_names[i];
        }
    }
    
//    current_path = current_video.replace(" ", "\ ");
    current_path = folder_path+current_path;

    console.log("file_names: "+file_names);
    console.log("current_path: "+current_path);
    
    
    
    //go to upload page 
    await page.waitForSelector("[href='/upload?lang=en']");
    await page.evaluate(() => {
        document.querySelector("[href='/upload?lang=en']").click();
    });
    console.log("Upload Process Started");

    //choose video
    var elementHandle = await page.waitForSelector('iframe');
    var frame = await elementHandle.contentFrame();
    await frame.waitForSelector('.css-14w2a8u');
    const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
//        page.querySelector("[iframe]")[0].contentWindow.page.querySelector(".css-14w2a8u").click(),
        frame.click(".css-14w2a8u"),
    ]);
    await fileChooser.accept([current_path]);
    console.log("Uploading: "+current_path);
    
    //set title
//    await page.waitForSelector("[class='jsx-1043401508 jsx-723559856 jsx-1657608162 jsx-3887553297 container-v2']");
    await frame.waitForSelector('.jsx-2745951964');
    await frame.click(".jsx-2745951964");
    
    for (var i = 0; i < current_video.length; i++) {
        await page.keyboard.press(current_video[i]);
    }
    
    console.log("Uploading ... ");
    //click upload
    
    await frame.waitForSelector('.change-video-btn', { timeout: 0});
    console.log("uploaded!")
    await frame.click(".css-n99h88");
    await frame.waitForSelector('.jsx-461155393');
    console.log("Finished Processing!")
    number_of_videos_uploaded = number_of_videos_uploaded+1;
    
}

async function login(page) {
    console.log("Logging in");
    await page.goto("https://www.tiktok.com/login/phone-or-email/email");
    await page.waitForSelector("[type='text']");
    await page.evaluate(() => {
        document.querySelector("[type='text']").focus();
    });

    for (var i = 0; i < username.length; i++) {
        await page.keyboard.press(username[i]);
    }

    await page.waitForSelector("[type='password']");
    await page.evaluate(() => {
        document.querySelector("[type='password']").focus();
    });
    for (var i = 0; i < password.length; i++) {
        await page.keyboard.press(password[i]);
    }

    await page.evaluate(() => {
        document.querySelector("[type='submit']").click();
    });

    console.log("Waiting 30s");
    setTimeout(function () {
        upload(page);
    }, 30000);
}

async function start(page) {
    console.log("Check if logged in");
    var loginstate = 'Loginstate could not be defined';
    await page.waitForSelector("[class='tiktok-12azhi0-DivHeaderContainer e10win0d0']");
    await page.evaluate((loginstate) => {
        if (document.querySelector("[class='tiktok-12azhi0-DivHeaderContainer e10win0d0']").innerHTML.search("Log in") >= 0) {
            loginstate = false;
        } else if (document.querySelector("[class='tiktok-12azhi0-DivHeaderContainer e10win0d0']").innerHTML.search("Log in") == -1){
            loginstate = true;
        }
        return loginstate;
    }, loginstate).then((loginstate) => {
        console.log("loginstate = "+loginstate);
        if (loginstate == false) {
            console.log("Logged out");
            login(page);
        } else if (loginstate == true) {
            console.log("Logged in");
            upload(page);
        }
    },loginstate);

    

}

async function tiktok() {
    console.log("-----------------------------");
    console.log("Starting...");
    let url = 'https://www.tiktok.com';
//    let url = 'https://www.tiktok.com/login/phone-or-email/email';
//    let url = 'https://online-audio-converter.com/de/';
    let browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disabled-setupid-sandbox", '--disable-features=site-per-process'],
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ignoreHTTPSErrors: true,
        headless: false,
        defaultViewport: null,
        userDataDir: '/tmp/myChromeSession'
    });
    console.log("Opening Browser");
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    await page.setDefaultNavigationTimeout(120000); 
    console.log("Going to URL");
    await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 0
    });
    
    var interval = setInterval(function() {
        let current_hour = new Date().getHours();
        let current_minutes = new Date().getMinutes();
        if ( schedule_u.includes(current_hour) && random_minutes.includes(current_minutes) ) {
            console.log("Time to upload!!");
            console.log("schedule_u = "+schedule_u);
            console.log("random_minutes = "+random_minutes);
            schedule_u.splice(schedule_u.indexOf(current_hour), 1);
            start(page);
        } else {
            console.log("not now");
            if(current_hour == 3) {
                schedule_u = schedule;
                random_minutes = [];
                for (var i = 0; i < current_hour.length; i++) {
                    random_minutes.push(Math.floor(Math.random() * 45) + 10);
                }
            }
        }
    },30000);

}

tiktok();
