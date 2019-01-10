/** @format */

import * as PIXI from 'pixi.js';
import loader from '@lib/loader.js';
import ui from '@lib/ui.js';

import '@res/style.css';

const width = 1280;
const height = 720;

var app = new PIXI.Application(width, height, { backgroundColor: 0x1099bb });
document.body.appendChild(app.view);

loader('/res/samples/', require('@res/samples/test.json')).then((conf) => {
	let wind = new ui(conf);
	wind.position.set(width / 2, height / 2);

	let ws = conf.scene.size[0] / width;
	let hs = conf.scene.size[1] / height;
	wind.scale.set(ws > hs ? ws : hs);

	app.stage.addChild(wind);

	wind.nodes.prep_tab.nodes.charge_progress.setProgress(0.8);
	wind.nodes.close_btn.on('pointerdown', () => {
		console.log('close window');
	});
});
