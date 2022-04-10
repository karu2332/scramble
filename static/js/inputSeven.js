// SPDX-License-Identifier: MIT
//
// Copyright 2022, Andy Rudoff. All rights reserved.
//
// inputSeven.js -- client-side js for inputSeven
//

"use strict";

// inputSeven -- seven letter input widget
//    id is the element in which to put thw widget (must class="input-seven")
//    letters is an array of seven letters
//    onWord is the callback, passed a word user inputs it
function inputSeven(id, letters, onWord) {
    // create the two-layer canvas, layer0 and layer1
    const $inputSeven = document.getElementById(id);
    $inputSeven.innerHTML = `
<div id="input-seven-word"></div><br>
<canvas id="input-seven-layer0" width="200" height="200"></canvas>
<canvas id="input-seven-layer1" width="200" height="200"></canvas>
`;
    const $word = document.getElementById('input-seven-word');
    const $layer0 = document.getElementById('input-seven-layer0');
    const $layer1 = document.getElementById('input-seven-layer1');
    const ctx0 = $layer0.getContext('2d');
    const ctx1 = $layer1.getContext('2d');

    //
    // private widget state...
    //

    let radius = $layer0.height / 2;
    let down = false;   // true when mouse is down (finger is down on mobile)
    // keep track of which letter in letters[] are "used up" so far
    let used = [ false, false, false, false, false, false, false ];
    let opsLayer1 = []; // list of operations required to redraw layer1
    let wordSoFar = ''; // the word input so far
    let lastX;          // x coord of last letter added to word
    let lastY;          // y coord of last letter added to word
    let fadeInProgress = false; // true if currently fading out word
    let fadeAlpha = 1;  // current alpha channel value for fade out

    // translate to center of layer0 canvas and scale down radius a bit
    ctx0.translate(radius, radius);
    radius = radius * 0.90;

    // fixed sized widget, so the center of each letter doesn't
    // need to be calculated, we just fetch them from this table
    const loc = [
        { x: 101, y: 27 },   // letter 0
        { x: 157, y: 54 },   // letter 1
        { x: 171, y: 114 },  // letter 2
        { x: 131, y: 163 },  // letter 3
        { x: 70, y: 164 },   // letter 4
        { x: 31, y: 115 },   // letter 5
        { x: 45, y: 54 },    // letter 6
    ];

    //
    // define all our private methods used for this widget...
    //

    // draw the letters in seven equal distances around a circle
    const drawLetters = function(ctx, radius, letters) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2*Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        let grad =
            ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.05);
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.5, 'white');
        grad.addColorStop(1, '#333');
        ctx.strokeStyle = grad;
        ctx.lineWidth = radius * 0.1;
        ctx.stroke();
        ctx.fillStyle = 'black';

        ctx.font = radius*0.25 + "px arial";
        ctx.textBaseline="middle";
        ctx.textAlign="center";
        for (let n = 0; n < 7; n++){
            const angle = n * Math.PI / 3.5;
            ctx.rotate(angle);
            ctx.translate(0, -radius*0.80);
            ctx.rotate(-angle);
            ctx.fillText(letters[n].toUpperCase(), 0, 0);
            ctx.rotate(angle);
            ctx.translate(0, radius*0.80);
            ctx.rotate(-angle);
        }
    }

    // calculate the mouse coordinates from raw event values
    const mouseXY = function(e) {
        const r = $layer0.getBoundingClientRect();
        const scaleX = $layer0.width / r.width;
        const scaleY = $layer0.height / r.height;
        return {
            x: Math.round((e.clientX - r.left) * scaleX),
            y: Math.round((e.clientY - r.top) * scaleY)
        }
    };

    // execute draw operations on layer1
    const execute = function(op) {
        switch(op.what) {
        case 'circle':
            ctx1.beginPath();
            ctx1.arc(op.x, op.y, 15, 0, 2 * Math.PI);
            ctx1.fillStyle = 'rgba(200, 128, 255, 0.3)';
            ctx1.fill();
            break;
        case 'line':
            ctx1.beginPath();
            ctx1.strokeStyle = 'rgba(200, 128, 255, 0.3)';
            ctx1.lineWidth = '15';
            ctx1.moveTo(op.fromX, op.fromY);
            ctx1.lineTo(op.toX, op.toY);
            ctx1.stroke();
            break;
        }

    };

    // store operation (for redraw) and execute layer1 drawing operation
    const logAndExecute = function(op) {
        opsLayer1.push(op);
        execute(op);
    };

    // clear layer1 and redraw using stored list of operations
    const redraw = function() {
        ctx1.clearRect(0, 0, $layer1.width, $layer1.height);
        for (const op of opsLayer1) {
            execute(op);
        }
    };

    // user dragged pointer over a letter, add it to the word
    const addLetter = function(idx) {
        used[idx] = true;
        //console.log(`letter ${letters[idx]}`);
        const xy = loc[idx];
        logAndExecute({ what: 'circle', x: xy.x, y: xy.y });
        wordSoFar += letters[idx];
        //console.log(`addLetter, now word is: ${wordSoFar}`);
        $word.innerHTML = wordSoFar;
    };

    // process mouse coordinates, adding lines and letters as appropriate
    const addXY = function(x, y) {
        for (var i = 0; i < 7; i++) {
            if (used[i]) {
                continue;
            }
            const xy = loc[i];
            if (x > xy.x - 18 && x < xy.x + 18 &&
                y > xy.y - 18 && y < xy.y + 18) {
                if (wordSoFar) {
                    // stroke from middle of last letter to middle of this one
                    redraw();
                    logAndExecute({ what: 'line', fromX: lastX, fromY: lastY,
                        toX: xy.x, toY: xy.y });
                }
                addLetter(i);
                lastX = xy.x;
                lastY = xy.y;
                return;
            }
        }
        // not in a letter, if draging pointer away from a letter,
        // draw a line from that letter to the current position
        if (wordSoFar) {
            redraw();
            execute({ what: 'line', fromX: lastX, fromY: lastY,
                toX: x, toY: y });
        }
    };

    // advance the fade out of the word by one step, check if fade is done
    const fadeStep = function() {
        if (fadeInProgress) {
            if (fadeAlpha < 0.01) {
                resetWord();
                return;
            }
            fadeAlpha -= 0.03;
            $word.style.color = `rgba(0, 0, 0, ${fadeAlpha})`;
            setTimeout(fadeStep, 100);
        }
    };

    // end of inputting a word, use callback to pass it back to caller
    const endWord = function() {
        onWord(wordSoFar);
        down = false;
        used = [ false, false, false, false, false, false, false ];
        opsLayer1 = [];
        wordSoFar = '';
        ctx1.clearRect(0, 0, $layer1.width, $layer1.height);
        fadeInProgress = true;
        fadeStep();
    };

    // reset the word area to begin a new word
    const resetWord = function() {
        $word.innerHTML = '';
        $word.style.color = 'black';
        fadeInProgress = false;
        fadeAlpha = 1;
    };

    //
    // use the above methods to draw the inputSeven widget
    // and handle all the input events...
    //

    // draw layer0
    drawLetters(ctx0, radius, letters);

    // listen for mouse up
    $layer1.addEventListener('pointerup', function(event) {
        const xy = mouseXY(event);
        //console.log(`up ${xy.x} ${xy.y} word is "${wordSoFar}"`);
        endWord();
    });

    // listen for mouse out
    $layer1.addEventListener('pointerout', function(event) {
        const xy = mouseXY(event);
        //console.log(`out ${xy.x} ${xy.y}`);
        endWord();
    });

    // listen for mouse moves
    $layer1.addEventListener('pointermove', function(event) {
        if (down) {
            const xy = mouseXY(event);
            //console.log(`move ${xy.x} ${xy.y}`);
            addXY(xy.x, xy.y);
        }
    });

    // listen for mouse down
    $layer1.addEventListener('pointerdown', function(event) {
        resetWord();
        const xy = mouseXY(event);
        //console.log(`down ${xy.x} ${xy.y}`);
        down = true;
        addXY(xy.x, xy.y);
    });

    //
    // support using a device with a physical keyboard, where
    // used/unallowed characters are ignored and space bar or
    // return ends the word.  also left arrow and backspace will
    // delete the last character input.
    //

    let keyboardInputCount = 0;

    const keyboardInput = function(c) {
        //console.log(`keyboardInput: ${c}`);
        if (keyboardInputCount === 0) {
            resetWord();    // beginning a word
        }
        for (let i = 0; i < 7; i++) {
            if (letters[i] === c && !used[i]) {
                addLetter(i);
                keyboardInputCount++;
                break;
            }
        }
    };
    const keyboardDelete = function() {
        //console.log(`keyboardDelete`);
        if (keyboardInputCount === 0) {
            return;
        }
        // reset all the state and re-enter everything but the last letter
        let entered = wordSoFar;
        let wantCount = keyboardInputCount - 1;
        down = false;
        used = [ false, false, false, false, false, false, false ];
        opsLayer1 = [];
        wordSoFar = '';
        ctx1.clearRect(0, 0, $layer1.width, $layer1.height);
        resetWord();
        keyboardInputCount = 0;
        for (let i = 0; i < wantCount; i++) {
            keyboardInput(entered[i]);
        }
    };
    const keyboardEnd = function() {
        //console.log(`keyboardEnd`);
        endWord();
        keyboardInputCount = 0;
    };

	document.addEventListener('keypress', function(event) {
        if (document.getElementById(id) === null) {
            return; // widget went away
        }
        //console.log(`keypress ${event.which}`);
		if (event.which >= 65 && event.which <= 90) {
            // upper case letter
			keyboardInput(String.fromCharCode(event.which).toLowerCase());
			event.preventDefault();
        } else if (event.which >= 97 && event.which <= 122) {
            // lower case letter
			keyboardInput(String.fromCharCode(event.which));
			event.preventDefault();
		} else if (event.which === 13 || event.which === 32) {
	 		// return or space bar
	 		keyboardEnd();
			event.preventDefault();
		} else if (event.which === 45) {
	 		// '-' erases
	 		keyboardDelete();
			event.preventDefault();
	 	}

	});

	// left arrow and delete keys
	document.addEventListener('keydown', function(event) {
        if (document.getElementById(id) === null) {
            return; // widget went away
        }
        //console.log(`keydown ${event.which}`);
		switch (event.which) {
		case 8: // delete
		case 37: // left
			keyboardDelete();
            event.preventDefault();
		break;
        }
	});
}
