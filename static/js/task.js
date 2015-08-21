/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = PsiTurk(uniqueId, adServerLoc);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to

var condition_name = "";
var num_words_studied = 18;
var list_repetitions = 4;
var time_per_stimulus = 3000;
var total_time = num_words_studied*list_repetitions*time_per_stimulus/1000;
console.log("study period duration: "+total_time);

var IMG_DIR = "static/images/objects/";

// All pages to be loaded
var pages = [
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	"instructions/instruct-ready.html",
	"instructions/instruct-test.html",
	"stage.html",
	"postquestionnaire.html"
];

psiTurk.preloadPages(pages);

var instructionPages = [
	"instructions/instruct-1.html",
	"instructions/instruct-ready.html"
];

var testInstructions = [
	"instructions/instruct-test.html"
];

var database = new Firebase('https://fiery-torch-5666.firebaseio.com/');
//var dbref = newFirebase('https://memory-vs-xsl1.firebaseio.com/');
//var database = dbref.child("subjects");
// database.push({name: name, text: text});
// callback to let us know when a new message is added: database.on('child_added', function(snapshot) {
//	var msg = snapshot.val();
//	doSomething(msg.name, msg.text);
// });

/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and
* insert them into the document.
*
********************/

var Experiment = function() {

	var wordon, // time word is presented
	    listening = false;

	var pairs_per_trial = 0;
	var shuffle_trials = false;
	if(mycondition==="0") {
		pairs_per_trial = 1;
		condition_name = "1pair_noshuffle";
	} else if(mycondition==="1") {
		pairs_per_trial = 1;
		condition_name = "2pair_noshuffle";
	} else if(mycondition==="2") {
		pairs_per_trial = 1;
		condition_name = "1pair_shuffle";
		shuffle_trials = true;
	} else if(mycondition==="3") {
		pairs_per_trial = 2;
		condition_name = "2pair_shuffle";
		shuffle_trials = true;
	}
	console.log("mycondition: "+mycondition+" condition_name: "+condition_name + " pairs_per_trial: "+pairs_per_trial);

	var VERBAL_STIM = ["gasser", "coro", "plib", "bosa", "habble", "pumbi", "kaki", "regli", "permi",
		"gaso", "toma", "setar", "temi", "menick", "gosten", "fema", "gheck", "lanty", "ragol", "gelom",
		"feek", "rery", "galad", "bofe", "prino", "lano", "detee", "grup", "heca", "spati", "gidi", "pid",
		"bispit", "ceff", "netu", "mapoo", "colat", "patost", "rofe", "fofi", "molick", "spiczan", "slovy",
		"manu", "poda", "dorf", "vindi", "kupe", "nibo", "wug", "badu", "amma", "ghettle", "kala", "belmi",
		"lurf", "blug", "poove", "spret", "hoft", "prew", "nicote", "sanny", "jeba", "embo", "fexo", "woby",
		"dilla", "arly", "zear", "luli", "grum"]; // 72 words -- not matched to voiced stimuli

	var images = [];
	for (var i = 1; i <= 72; i++) {
   		images.push(i);
	}

	objs = _.shuffle(images)
	words = _.shuffle(VERBAL_STIM);

	var stimuli = []; // take first N
	for(i = 0; i<num_words_studied; i++) {
		stimuli.push({"word":words[i], "obj":objs[i], "studied":list_repetitions});
	}

	var trials = [];
	var index = 1;
	for(m = 0; m<list_repetitions; m++) {
		if(shuffle_trials) { // shuffle each batch of repetitions
			stimuli = _.shuffle(stimuli);
		}
		for(i = 0; i<stimuli.length; i++) {
			stimuli[i].index = index;
			trials.push(stimuli[i]);
			index += 1;
		}
	}

	//console.log(trials);

	var next = function() {
		if (trials.length===0) {
			finish();
		}
		else {
			var stim = [trials.shift()];
			var time;
			if(pairs_per_trial===1) { // 1 per trial
				time = time_per_stimulus;
			} else if(pairs_per_trial===2) {
				stim.push(trials.shift());
				time = time_per_stimulus*2;
			}
			wordon = new Date().getTime();
			console.log(pairs_per_trial);
			console.log(stim);
			show_stim( stim, time, wordon );
		}
	};

	var finish = function() {
	    // add a novel word/object pair for testing?
	    stimuli.push({"word":words[words.length-1], "obj":objs[objs.length-1], "studied":0})
	    stimuli = _.shuffle(stimuli)
	    psiTurk.doInstructions(
    		testInstructions, // a list of pages you want to display in sequence
    		function() { currentview = new Test(stimuli); } // what you want to do when you are done with instructions
    	);
	};

	var record_study_trial = function(stim, time, wordon) {
		for(var i = 0; i < stim.length; i++) {
			var dat = {'uniqueId':uniqueId, 'condition':condition_name, 'phase':"STUDY", 'index':stim[i].index,
				'word':stim[i].word, 'obj':stim[i].obj, 'duration':time, 'timestamp':wordon};
			console.log(dat);
			//psiTurk.recordTrialData(dat);
			database.push(dat);
		}
	};

	var show_stim = function(stim, time, wordon) {
		record_study_trial(stim, time, wordon);
		//console.log(stim);
		var svg = d3.select("#visual_stim")
			.append("svg")
			.attr("width",480)
			.attr("height",250);

		svg.selectAll("image")
			.data(stim)
			.enter()
			.append("image")
      		.attr("xlink:href", function(d,i) { return IMG_DIR+d.obj+".jpg"; })
      		.attr("x", function(d,i) { return i*200+60 })
      		.attr("y", 10)
      		.attr("width",120)
      		.attr("height",120)
      		.style("opacity",1);

		svg.selectAll("text")
			.data(stim)
			.enter()
			.append("text")
			.attr("x", function(d,i) { return i*200+50; })
			.attr("y",180)
			.style("fill",'black')
			.style("text-align","center")
			.style("font-size","50px")
			.style("font-weight","200")
			.style("margin","20px")
			.text(function(d,i) { return d.word; });

		setTimeout(function() {
			remove_stim();
			next();
		}, time);
	};

	var remove_stim = function() {
		d3.select("svg").remove();
	};

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('stage.html');
	// Start the test
	next();
};




var Test = function(stimuli) {
	// shuffle the words and present each one along with all of the objects
	// prompt them: "Choose the best object for"  (later: try choosing top two or three? or choose until correct?)
	var all_objs = stimuli.slice(0);

	var finish = function() {
	    //$("body").unbind("keydown", response_handler); // Unbind keys
	    currentview = new Questionnaire();
	};

	var next = function() {
		if (stimuli.length===0) {
			finish();
		}
		else {
			var stim = stimuli.shift(); // remove words as tested
			show_test( stim, all_objs );
		}
	};

	var show_test = function(stim, all_objs) {
		wordon = new Date().getTime();
		//console.log(all_objs);
		d3.select("#prompt").html('<h1>Click on the '+ stim.word +'</h1>');

		var rectGrid = d3.layout.grid()
    		.bands()
    		.nodeSize([100, 100])
    		.padding([20, 20]); // padding is absolute if nodeSize is used
    		// .size([100,100])

    	var objs = d3.select("#visual_stim").append("svg")
			.attr({
				width: 1024,
				height: 768
			})
			.attr("id", "objArray")
			.append("g")
			.attr("transform", "translate(50,40)");

		var rect = objs.selectAll(".rect")
			.data(rectGrid(all_objs));

		//console.log(rect);

		rect.enter().append("image")
			.attr("xlink:href", function(d) { return IMG_DIR+d.obj+".jpg"; })
			.attr("class", "rect")
			.attr("id", function(d) { return d.obj; })
			.attr("width", rectGrid.nodeSize()[0])
			.attr("height", rectGrid.nodeSize()[1])
			.attr("transform", function(d) { return "translate(" + (d.x + 20)+ "," + d.y + ")"; })
			.style("opacity", 1)
			.on("mousedown", function(d,i) {
				if(stim.obj===d.obj) {
					var correct = 1;
				} else {
					var correct = 0;
				}
				var rt = new Date().getTime() - wordon;

				var dat = {'condition':condition_name, 'phase':"TEST", 'word':stim.word, 'studied':stim.studied, 'correctAns':stim.obj,
					'response':d.obj, 'correct':correct, 'rt':rt}; // 'studyIndices':stim.studyIndices -- somehow record study...
				console.log(dat);
				psiTurk.recordTrialData(dat);
				dat.uniqueId = uniqueId;
				dat.timestamp = wordon;
				database.push(dat);
				remove_stim();
				next();
			});

	};

	//var record_test_trial = function() { }

	var remove_stim = function() {
		d3.select("svg").remove();
	};

	psiTurk.showPage('stage.html');
	next();
};


function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}


/****************
* Questionnaire *
****************/

var Questionnaire = function() {
	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	record_responses = function() {
		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});
		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
	};

	prompt_resubmit = function() {
		document.body.innerHTML = error_message; // d3.select("body")
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
		reprompt = setTimeout(prompt_resubmit, 10000);

		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt);
                //psiTurk.computeBonus('compute_bonus', function(){}); // was finish()
								psiTurk.completeHIT();
			},
			error: prompt_resubmit
		});
	};


	// Load the questionnaire snippet
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});

	$("#next").click(function () {
	    record_responses();
	    psiTurk.saveData({
            success: function(){
                //psiTurk.computeBonus('compute_bonus', function() {
						    psiTurk.completeHIT();
            },
            error: prompt_resubmit});
	});

};

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
$(window).load( function(){
    psiTurk.doInstructions(
    	instructionPages, // a list of pages you want to display in sequence
    	function() { currentview = new Experiment(); } // what you want to do when you are done with instructions
    );
});
