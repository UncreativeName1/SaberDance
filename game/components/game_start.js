import getBrightestPoint from "../lightTracker/detectLight.js";

const FPS = 30;
const thickness = 9;
// the number of recent frames to keep the movement line on for
const framesTracked = 10;

let src, dst, gray, cap;
let color;
let curLen = 0;
const coords = [];

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// remove first n elements from arr
function remove_front(arr, n) {
    if (arr.length < n) {
        return [];
    }
    while (n > 0) {
        arr.shift();
        n--;
    }
    return arr;
}


// 1. Display the title of a level on screen for 5 seconds.
function showLevelTitle(title) {
    const titleElement = document.getElementById("level_title");
    titleElement.innerHTML = title; 

    setTimeout(() => {
        titleElement.innerHTML = "";
        const event = new Event('titleDone');
        document.dispatchEvent(event);
    }, 3000);
}

// determines if loop keeps running
let keepRunning = true;
document.addEventListener('keydown', function(event) {
    if (event.key === 'c') { 
        keepRunning = false;
    }
});

function createVideo() {
    let video = document.getElementById("cam_input");
    console.log(video);
    video.width = window.innerWidth / 2;
    video.height = window.innerHeight / 2;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occurred! " + err);
    });
    console.log(cv);
    
    color = new cv.Scalar(0, 255, 0, 255);

    function onVideoPlaying() {
        // Now initialize src
        let videoWidth = video.videoWidth;
        let videoHeight = video.videoHeight;

        if (videoWidth > 0 && videoHeight > 0) {
            // console.log(videoWidth, videoHeight)
            src = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
            dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
            gray = new cv.Mat();
            cap = new cv.VideoCapture(cam_input);
        } else {
            console.error('Video dimensions are not available yet');
        }

        // Remove the event listener after it's been executed.
        video.removeEventListener('playing', onVideoPlaying);

        // schedule first frame processing.
        setTimeout(processVideo, 10);
    }

    video.addEventListener('playing', onVideoPlaying);

    function processVideo() {
        if (src) {
            let begin = Date.now();
            // console.log(src)
            // console.log(video.readyState);  // Should be >= 2 (HAVE_CURRENT_DATA) or ideally 4 (HAVE_ENOUGH_DATA)
            // console.log(video.videoWidth, video.videoHeight);  // Should be > 0
            // console.log(src.size());

            let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
            cap.read(frame);

            if (!frame) {
                console.log("Stopped receiving stream. Exiting ...");
                return;
            }

            // call image processing function
            const brightestPoint = getBrightestPoint(frame);
            let xPoint = brightestPoint['center_x']; 
            let yPoint = brightestPoint['center_y'];

            // handle out of bounds
            if (xPoint > video.width) {
                xPoint = video.width;
            } else if (xPoint < 0) {
                xPoint = 0;
            }
            if (yPoint > video.height) {
                yPoint = video.height;
            } else if (yPoint < 0) {
                yPoint = 0;
            }

            const coord = new Coord(xPoint, yPoint);
            // reflect across center of video capture
            //console.log(`${xPoint}, ${yPoint}`);

            coords.push(coord);
            curLen++;

            // Draw indicator
            const framesExceeded = curLen - framesTracked;
            if (curLen > framesTracked) {
                remove_front(coords, framesExceeded);
                curLen -= framesExceeded;
            }

            for (let i = 1; i < curLen; i++) {
                const prevX = coords[i].x;
                const prevY = coords[i].y;
                const curX = coords[i - 1].x;
                const curY = coords[i - 1].y;
            
                // Convert the coordinates to cv.Point
                let prevPoint = new cv.Point(prevX, prevY);
                let curPoint = new cv.Point(curX, curY);
                cv.line(frame, prevPoint, curPoint, color, thickness);
            }

            // Display the resulting frame
            cv.imshow('canvas_output', frame);
            frame.delete();
            // check next frame
            if (keepRunning) {
                let delay = 1000/FPS - (Date.now() - begin);
                setTimeout(processVideo, delay);
            }
            else {
                src.delete();
                dst.delete();
                gray.delete();
                //console.log("h")
                const event = new Event('introDone');
                document.dispatchEvent(event);
            }
        }
    }
    // Remove the event listener after it's been executed.
    document.removeEventListener('titleDone', createVideo);
}

showLevelTitle('Level 1');
document.addEventListener('titleDone', createVideo);

