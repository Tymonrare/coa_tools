/** @format */

import * as PIXI from 'pixi.js';
import loader from '@lib/loader.js';
import makeUi from '@lib/ui.js';

const width = 1280;
const height = 720;

var app = new PIXI.Application(width, height, { backgroundColor: 0x1099bb });
document.body.appendChild(app.view);

loader('/res/samples/', require('@res/samples/test.json')).then((conf) => {
	let wind = makeUi(conf);
	wind.position.set(width / 2, height / 2);
	app.stage.addChild(wind);

	wind.nodes.test.setProgress(0.8);
});
