<!-- @format -->

coa_tools importer for pixi, [details](https://github.com/Tymonrare/coa_tools) about coa_tools.

# Usage

```javascript
import coa from 'pixi_coa_importer';

coa.loader(
    '/res/samples/', //absolute path to resourses, may be url or anything
    require('/res/samples/test.json')) //json with config
  .then((conf) => {
		let properties = {
			debugTree: true, //print node tree in console
			debugTreeVerbose: true, //print verbose tree
			debugBounds: true, //draw debug bounds
			fonts:{} //fonts ids
		}

		let ui = new coa.ui(conf, properties); //create window
		wind.position.set(width / 2, height / 2);

		ui.layer_name; //Access to exportet layers
		ui.group_name.layer_name; //Access to nested groups

		ui.button.on('pointerdown', ()=>{console.log('click')}); //buttons works with all pixi events
		ui.progress.binding = 0.5; //Set progress bar to half

		ui.gnodes.label_text; //Access to nodes with flag --global

		ui.gbinds.label_text = "Your label"; //Set value of global nodes bind
		ui.gnodes.label_text.updateBinding("Another label"); //You can access to that prop manually

		ui.gbinds.close_btn = function(){}; //Buttons callbacks

		ui.gbinds.list = [{text_area:"text", sprite_area:"srite", btn:function(){}}]; //geterate lists for `list --global type=container`
		ui.gbinds.list.push({...}); //push, pop, insert itc.
		ui.gbinds.list.push({$elementCreated: function(child){}}); //you can handle element creation
		ui.gbinds.siplestList = [true, false, 123] //for nodes without binds counts only array length

		//You can't push in your own array like:
		//let a = [true, true];
		//binds.node = a;
		//a.push(true); //not gonna work
		//binds.node.push(true) //gonna work

});

```

# Text pattenrs

You can draw custom sprites inside text_area and btn text

```javascript
	PIXI.loader.add('devIcon', 'res/develop.png').load(callback); //preload pixi texture first

	//some abstract coa window
	let wind = new ui(conf, {
		customTextSymbols: { testIcon: PIXI.Texture.from('res/develop.png') }
	});

	//pass <{symbolName}> into text to print that sprite
	window.gbinds.your_text_area = 'some text and inserted icon: <{testIcon}>'

	//will print 11 inside symbol
	window.gbinds.your_text_area1 = 'some text and inserted icon with text: <{testIcon}[11]>'

	//you can combine it whatever you like
	window.gbinds.your_text_area1 = 'some text and inserted icon with text: <{testIcon}[text]{anotherIcon}> <[text under icon]{anotherIcon1}>'
```
