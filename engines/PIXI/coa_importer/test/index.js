/** @format */

import * as PIXI from 'pixi.js';
import loader from '@lib/loader.js';
import ui from '@lib/ui/index.js';

import '@res/style.css';

const width = 1280;
const height = 720;

var app = new PIXI.Application(width, height, { backgroundColor: 0x1099bb });
document.body.appendChild(app.view);

loader('/res/samples/', require('@res/samples/test.json')).then((conf) => {
	let wind = new ui(conf);
	wind.setPosition(width / 2, height / 2);

	let ws = conf.scene.size[0] / width;
	let hs = conf.scene.size[1] / height;
	wind.scale.set(ws > hs ? ws : hs);

	app.stage.addChild(wind);

	//test progress
	wind.gnodes.charge_progress.setProgress(0.7);
	//test btn
	wind.nodes.close_btn.on('pointerdown', () => {
		console.log('close window');
	});

	{
		let child = wind.gnodes.test_bind1;
		//child.parent.removeChild(child);
		let node = child.node;
		console.log(node);
		for(let i = 1; i < 3; i++){
			let obj = wind.addNodeClone(node);
			obj.position.y += 100*i;
		}
	}

	console.log(wind)
});
