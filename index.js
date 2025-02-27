const _copy = data => {
	const type = typeof(data);
	if(data && type==="object") {
		return Object.keys(data).reduce((accum,key) => { accum[key] = _copy(data[key]); return accum; },{});
	}
	return data;
};

// remove puntuation except possible : and return space separated tokens
const _tokenize = (value, isObject) => {
	return value
		.replace(new RegExp(`[^A-Za-z0-9\\s${isObject ? '\:' : ''}]`, 'g'), '')
		.replace(/  +/g, ' ')
		.toLowerCase()
		.split(' ');
};

// return an array of possible misspelling for a word based on common patterns of error
// will often return uncommon misspellings, but that's ok, it keeps the code simple without a dictionary
const _misspellings = (value, compress) => {
	const results = [];

	if (compress) {
	// remove double letter occurrance, e.g. occurance vs ocurance
		const dedoubled = Object.values(value).reduce((accum, char) => accum[accum.length - 1] === char ? accum : accum += char, '');
		if(dedoubled!==value) {
			value = dedoubled;
			results.push(dedoubled)
		}
	}

	// common misspelling signatures
	if (value.includes("ie")) results.push(value.replace(/ie/g, "ei"));
	if (value.includes("ei")) results.push(value.replace(/ei/g, "ie"));
	// @todo: The following 3 lines return this linting error
	// This condition will always return 'false' since the types 'boolean' and '"e"' have no overlap.
	if (value.includes("ea") && !value[0] === "e" && !value[value.length - 1] === "a") results.push(value.replace(/ea/g, "e"));
	if (value.includes("sc") && !value[0] === "s" && !value[value.length - 1] === "c") results.push(value.replace(/sc/g, "c"));
	if (value.includes("os") && !value[0] === "o" && !value[value.length - 1] === "s") results.push(value.replace(/os/g, "ous"));
	if (value.endsWith("ery")) results.push(value.substring(0, value.length - 3) + "ary");
	if (value.includes("ite")) results.push(value.replace(/ite/g, "ate"));
	if (value.endsWith("ent")) results.push(value.substring(0, value.length - 3) + "ant");
	if (value.endsWith("eur")) results.push(value.substring(0, value.length - 3) + "er");
	if (value.endsWith("for")) results.push(value + "e");
	if (value.startsWith("gua")) results.push("gau" + value.substring(4));
	if (value.endsWith("oah")) results.push(value.substring(0, value.length - 3) + "aoh");
	if (value.endsWith("ally")) results.push(value.substring(0, value.length - 4) + "ly");
	if (value.endsWith("ence")) results.push(value.substring(0, value.length - 4) + "ance");
	if (value.endsWith("fore")) results.push(value.substring(0, value.length - 1));
	if (value.endsWith("ious")) results.push(value.substring(0, value.length - 4) + "ous");
	if (value.endsWith("guese")) results.push(value.substring(0, value.length - 4) + "gese");
	if (value.endsWith("ible")) results.push(value.substring(0, value.length - 4) + "able");
	if (value.startsWith("busi")) results.push("buis" + value.substring(5));
	if (value.startsWith("fore")) results.push("for" + value.substring(5));
	if (value.startsWith("fluor")) results.push("flor" + value.substring(5));
	if (value.startsWith("propa")) results.push("propo" + value.substring(5));
	return results;
};

// remove vowels from a word
const _disemvowel = value => value.replace(/[AEIOUaeiou]+/g, '');

// disemvowel and remove spaces
const _compress = value => Object.values(_disemvowel(value)).reduce((accum, char) => accum[accum.length - 1] === char ? accum : accum += char, '');

// join all the tokens together and return an array of three letter sequences, stepping through string one char at a time
// except treat numbers as numbers
const _trigrams = tokens => {
	const {string,grams} = tokens.reduce((accum, token) => {
			if(isNaN(parseFloat(token))) {
				accum.string += token;
			} else {
				accum.grams.push(token);
			}
			return accum;
		}, {
			string:'',
			grams:[]
		});

		//str = Array.isArray(tokens) ? tokens.join("") : tokens+"";
	for (let i = 0; i < string.length - 2; i++) {
		grams.push(string.substring(i, i + 3));
	}

	return grams;
};

//stemmer adapted from from https://github.com/words/stemmer MIT License, Titus Wormer
/* Character code for `y`. */
const CC_Y = 'y'.charCodeAt(0);

/* Standard suffix manipulations. */
const step2list = {
	ational: 'ate',
	tional: 'tion',
	enci: 'ence',
	anci: 'ance',
	izer: 'ize',
	bli: 'ble',
	alli: 'al',
	entli: 'ent',
	eli: 'e',
	ousli: 'ous',
	ization: 'ize',
	ation: 'ate',
	ator: 'ate',
	alism: 'al',
	iveness: 'ive',
	fulness: 'ful',
	ousness: 'ous',
	aliti: 'al',
	iviti: 'ive',
	biliti: 'ble',
	logi: 'log'
};

const step3list = {
	icate: 'ic',
	ative: '',
	alize: 'al',
	iciti: 'ic',
	ical: 'ic',
	ful: '',
	ness: ''
};

/* Consonant-vowel sequences. */
const consonant = '[^aeiou]';
const vowel = '[aeiouy]';
const consonantSequence = '(' + consonant + '[^aeiouy]*)';
const vowelSequence = '(' + vowel + '[aeiou]*)';

const MEASURE_GT_0 = new RegExp(
	'^' + consonantSequence + '?' + vowelSequence + consonantSequence
);

const MEASURE_EQ_1 = new RegExp(
	'^' + consonantSequence + '?' + vowelSequence + consonantSequence +
	vowelSequence + '?$'
);

const MEASURE_GT_1 = new RegExp(
	'^' + consonantSequence + '?' +
	'(' + vowelSequence + consonantSequence + '){2,}'
);

const VOWEL_IN_STEM = new RegExp(
	'^' + consonantSequence + '?' + vowel
);

const CONSONANT_LIKE = new RegExp(
	'^' + consonantSequence + vowel + '[^aeiouwxy]$'
);

/* Exception expressions. */
const SUFFIX_LL = /ll$/;
const SUFFIX_E = /^(.+?)e$/;
const SUFFIX_Y = /^(.+?)y$/;
const SUFFIX_ION = /^(.+?(s|t))(ion)$/;
const SUFFIX_ED_OR_ING = /^(.+?)(ed|ing)$/;
const SUFFIX_AT_OR_BL_OR_IZ = /(at|bl|iz)$/;
const SUFFIX_EED = /^(.+?)eed$/;
const SUFFIX_S = /^.+?[^s]s$/;
const SUFFIX_SSES_OR_IES = /^.+?(ss|i)es$/;
const SUFFIX_MULTI_CONSONANT_LIKE = /([^aeiouylsz])\1$/;
const STEP_2 = new RegExp(
	'^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|' +
	'ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|' +
	'biliti|logi)$'
);
const STEP_3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
const STEP_4 = new RegExp(
	'^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|' +
	'iti|ous|ive|ize)$'
);

/* Stem `value`. */
function _stemmer(value) {
	let firstCharacterWasLowerCaseY;
	let match;

	value = String(value).toLowerCase();

	/* Exit early. */
	if (value.length < 3) {
		return value;
	}

	/* Detect initial `y`, make sure it never matches. */
	if (value.charCodeAt(0) === CC_Y) {
		firstCharacterWasLowerCaseY = true;
		value = 'Y' + value.substr(1);
	}

	/* Step 1a. */
	if (SUFFIX_SSES_OR_IES.test(value)) {
		/* Remove last two characters. */
		value = value.substr(0, value.length - 2);
	} else if (SUFFIX_S.test(value)) {
		/* Remove last character. */
		value = value.substr(0, value.length - 1);
	}

	/* Step 1b. */
	if (match = SUFFIX_EED.exec(value)) {
		if (MEASURE_GT_0.test(match[1])) {
			/* Remove last character. */
			value = value.substr(0, value.length - 1);
		}
	} else if ((match = SUFFIX_ED_OR_ING.exec(value)) && VOWEL_IN_STEM.test(match[1])) {
		value = match[1];

		if (SUFFIX_AT_OR_BL_OR_IZ.test(value)) {
			/* Append `e`. */
			value += 'e';
		} else if (SUFFIX_MULTI_CONSONANT_LIKE.test(value)) {
			/* Remove last character. */
			value = value.substr(0, value.length - 1);
		} else if (CONSONANT_LIKE.test(value)) {
			/* Append `e`. */
			value += 'e';
		}
	}

	/* Step 1c. */
	if ((match = SUFFIX_Y.exec(value)) && VOWEL_IN_STEM.test(match[1])) {
		/* Remove suffixing `y` and append `i`. */
		value = match[1] + 'i';
	}

	/* Step 2. */
	if ((match = STEP_2.exec(value)) && MEASURE_GT_0.test(match[1])) {
		value = match[1] + step2list[match[2]];
	}

	/* Step 3. */
	if ((match = STEP_3.exec(value)) && MEASURE_GT_0.test(match[1])) {
		value = match[1] + step3list[match[2]];
	}

	/* Step 4. */
	if (match = STEP_4.exec(value)) {
		if (MEASURE_GT_1.test(match[1])) {
			value = match[1];
		}
	} else if ((match = SUFFIX_ION.exec(value)) && MEASURE_GT_1.test(match[1])) {
		value = match[1];
	}

	/* Step 5. */
	if (
		(match = SUFFIX_E.exec(value)) &&
		(MEASURE_GT_1.test(match[1]) || (MEASURE_EQ_1.test(match[1]) && !CONSONANT_LIKE.test(match[1])))
	) {
		value = match[1];
	}

	if (SUFFIX_LL.test(value) && MEASURE_GT_1.test(value)) {
		value = value.substr(0, value.length - 1);
	}

	/* Turn initial `Y` back to `y`. */
	if (firstCharacterWasLowerCaseY) {
		value = 'y' + value.substr(1);
	}

	return value;
}


var STOPWORDS = [
	'a', 'about', 'after', 'ala', 'all', 'also', 'am', 'an', 'and', 'another', 'any', 'are', 
	'around','as', 'at', 'be',
	'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'came', 'can',
	'come', 'could', 'did', 'do', 'each', 'for', 'from', 'get', 'got', 'has', 'had',
	'he', 'have', 'her', 'here', 'him', 'himself', 'his', 'how', 'i', 'if', 'iff', 'in', 
	'include', 'into',
	'is', 'it', 'like', 'make', 'many', 'me', 'might', 'more', 'most', 'much', 'must',
	'my', 'never', 'now', 'of', 'on', 'only', 'or', 'other', 'our', 'out', 'over',
	'said', 'same', 'see', 'should', 'since', 'some', 'still', 'such', 'take', 'than',
	'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
	'through', 'to', 'too', 'under', 'up', 'very', 'was', 'way', 'we', 'well', 'were',
	'what', 'where', 'which', 'while', 'who', 'with', 'would', 'you', 'your'
];

// return all the values in an object's properties concatenated into a space separated string
// include the property names followed by :
function _toText(objectOrPrimitive, seen = new Set()) {
	if (objectOrPrimitive && typeof (objectOrPrimitive) === "object" && !seen.has(objectOrPrimitive)) {
		seen.add(objectOrPrimitive);
		return Object.keys(objectOrPrimitive)
			.reduce((accum, key, i, array) => accum += key + ": " + _toText(objectOrPrimitive[key], seen) + (i < array.length - 1 ? " " : ""), "");
	}
	return objectOrPrimitive;
}

// convert ids into numbers if possible
function _coerceId(id) {
	try {
		return JSON.parse(id);
	} catch(e) {
		return id;
	}
}

function Txi({
	stops = STOPWORDS,
	stems = true,
	trigrams = true,
	compressions = true,
	misspellings = true,
	onchange = _ => { },
	storage = {}
} = {}) {
	const defaults = {
		stops,
		stems,
		trigrams,
		compressions,
		misspellings,
		onchange,
		storage
	};

	// ensure Txi is called with the new operator
	if(!this || !(this instanceof Txi)) {
		return new Txi(defaults);
	}

	const defaultOnChange = _ => { };

	let {get,set,keys,count} = storage;
	
	// create stop map from array, stop words are not indexed
	stops = stops.reduce((accum,word) => {
		accum[word] = true;
		return accum;
	}, {});
	
	// the map to store the index, which is of the form
	// {[<characterSequence>:{<id>:{stems:<count>,trigrams:<count>,compressions:<count>,numbers:<count>,booleans:<count>}}[,...]}
	let keycount = 0;
	let index = {};
	
	if(!keys) {
		keys = async function* () {
			let i = 0;
			let key = keys[i];

			while(key) {
				yield key;
				key = keys[++i];
			}
		};
	}
	
	if(!get) {
		get = key => index[key];
	}
	
	if(!set) {
		set = (key,value) => index[key] = value;
	}

	// add words to the stop map created during instantiation
	this.addStops = (...words) => {
		words.forEach((word) => stops[word] = true);
		return this;
	}

	this.compress = () => {
		const onchange = this.onchange || defaultOnChange;

		Object.keys(index)
			.forEach(word => {
				const entry = index[word];
				const ids = Object.keys(entry);
				let changed;

				ids.forEach(id => {
					if (entry[id].stems === 0 && entry[id].trigrams === 0 && entry[id].compressions === 0) {
						delete entry[id];
						changed = true;
					}
				});

				if (Object.keys(entry).length === 0) {
					delete index[word];
					delete keys[word];
					onchange({
						[word]: null
					});
					keycount--;
				} else if(changed) {
					onchange({
						[word]: entry
					});
				}
			});
		return this;
	}

	// remove words from the stop map
	this.removeStops = (...words) => { 
		words.forEach((word) => delete stops[word]); 
		return this; 
	}

	// remove the provided ids from the index
	this.remove = async (...ids) => {
		const onchange = this.onchange || defaultOnChange;

		for(const id of ids) {
			for await(const word of keys()) {
				const node = await get(word);
				if(node && node[id]) { 
					delete node[id];
					await set(word,node);
					onchange({
						[word]: {
							[id]:{
								stems: 0,
								trigrams: 0,
								compressions: 0
							}
						}
					});
				}
			}
		}
		return this;
	}

	// return the index so that the calling program can perhaps store it somewhere
	this.getIndex = () => _copy(index);

	this.getKeys = async () => {
		const results = {};
		for await(const key of keys()) {
			results[key] = true;
		}
		return results;
	}

	this.getKeyCount = () => count ? count() : keycount;

	// set the index, in case the calling program is loading it from somewhere
	this.setIndex = newIndex => { 
		index = _copy(newIndex);
		keycount = 0;
		Object.assign(keys,Object.keys(index).reduce((accum,key) => { accum[key] = true; keycount++; return accum; }, {}));
		return this; 
	}

	// function to call every time an index entry is updated
	// called which can be used to update an external data structure using Object.assign(external,updates);
	// alternatively,it can be decomposed so that more precise updating of say a Redis store can be done incrementally
	this.onchange = defaults.onchange;

	// create an index entry with id by indexing objectOrText
	// use the id, perhaps a URL< to lookup the full object when it is returned in search results
	this.index = async function(id, objectOrText, {
		stems = defaults.stems,
		trigrams = defaults.trigrams,
		compressions = defaults.compressions,
		misspellings = defaults.misspellings
	} = defaults) {
		const type = typeof(objectOrText);

		if (!objectOrText || !(type === 'string' || type === 'object')) {
			return;
		}

		if (type === 'object') {
			stems = true;
		}

		const text = _toText(objectOrText);
		const tokens = objectOrText ? _tokenize(text, type ==='object') : [];
		const stemmed = (stems || type === 'object' ? tokens.reduce((accum,token) => { 
			const type = typeof(token);
			if (type !== 'number' && type !=='boolean') {
				const stem = _stemmer(token);
				if(!stops[stem]) {
					accum.push(stem);
				}
			}
			return accum;
		},[]) : []);
		const other = tokens.filter(token => token === 'true' || token ==='false' || !isNaN(parseFloat(token)));
		const noproperties = (stems ? stemmed : tokens).filter(token => {
			return token[token.length - 1] !== ':' && isNaN(parseFloat(token)) && token !== 'true' && token !== 'false';
		});
		const grams = trigrams ? _trigrams(noproperties) : [];
		const misspelled = (misspellings ? noproperties.reduce((accum,stem) => accum.concat(_misspellings(stem,true)), []) : []).filter(word => !grams.includes(word));
		const compressed = compressions ? noproperties.reduce((accum,stem) => accum.concat(_compress(stem)), []).concat(misspelled.reduce((accum,stem) => accum.concat(_compress(stem)), [])) : [];
		const onchange = this.onchange || defaultOnChange;
		const isBoolean = word => word === 'false' || word === 'true';
		const isNumber = word => !isNaN(parseFloat(word));
		let changes;
		let count = 0;

		for(const word of stemmed.concat(misspelled).concat(compressed).concat(other)) {
				// check stops again in case a compression is a stop
				if(!stops[word]) {
					let node = await get(word);
					let change;

					keys[word] = true;

					if(isBoolean(word)) {
						if(!node) {
							node = {};
							count++;
						}
						if(!node[id]) {
							node[id] =  {
								stems: 0,
								trigrams: 0,
								compressions: 0,
								numbers: 0,
								booleans: 0
							};
						}
						node[id].boolean++;
						change = node[id];
					}

					if(isNumber(word)) {
						if(!node) {
							node = {};
							count++;
						}
						if(!node[id]) {
							node[id] =  {
								stems:0,
								trigrams:0,
								compressions:0,
								numbers:0,
								booleans:0
							};
						}
						node[id].numbers++;
						change = node[id];
					}
					if(!isBoolean(word) && !isNumber(word)) {
						if(stems && (stemmed.includes(word) || misspelled.includes(word))) {
							if(!node) {
								node = {};
								count++;
							}
							if(!node[id]) {
								node[id] = {
									stems: 0,
									trigrams: 0,
									compressions: 0,
									numbers: 0,
									booleans: 0
								};
							}
							node[id].stems++;
							change = node[id];
						}
						if(compressions && compressed.includes(word)) {
							if(!node) {
								node = {};
								count++;
							}
							if(!node[id]) {
								node[id] =  {
									stems:0,
									trigrams:0,
									compressions:0
								};
							}
							node[id].compressions++;
							change = node[id];
						}
					}
					if(change) {
						if(!changes) {
							changes = {};
						}
						if(!changes[word]) {
							changes[word] = {};
						}
						changes[word][id] = change;
						await set(word,node);
					}
				}
		}

		for(const word of grams) {
			if(!stops[word]) {
				let node = await get(word);
				keys[word] = true;
				if(!node) {
					node = {};
					count++;
				}
				if(!node[id]) {
					node[id] = {
						stems: 0,
						trigrams: 0,
						compressions: 0,
						booleans: 0,
						numbers: 0
					};
				}
				node[id].trigrams++;
				if(!changes) {
					changes = {};
				}
				if(!changes[word]) {
					changes[word] = {};
				}
				changes[word][id] = node[id];
				await set(word,node);
			}
		}
		if(changes) onchange(changes);
		keycount += count;
		return this;
	}

	// return a sorted array of search results matching the provided objectOrText
	this.search = async function(objectOrText, {
		all,
		stems = defaults.stems,
		trigrams = defaults.trigrams,
		compressions = defaults.compressions,
		misspellings = defaults.misspellings
	} = defaults) {
		const type = typeof(objectOrText);

		if (!objectOrText || !(type === 'string' || type === 'object')) {
			return [];
		}
		if (type === 'object') {
			stems = true;
		}

		const text = _toText(objectOrText);
		const tokens = objectOrText ? _tokenize(text, type === 'object') : [];
		const stemmed = (stems || type === 'object' ? tokens.reduce((accum, token) => {
			const type = typeof (token);
			if (type !== 'number' && type !== 'boolean') {
				const stem = _stemmer(token);
				if (!stops[stem]) {
					accum.push(stem);
				}
			}
			return accum;
		},[]) : []);
		const other = tokens.filter(token => token === 'true' || token === 'false' || !isNaN(parseFloat(token)));
		const noproperties = (stems ? stemmed : tokens).filter(token => token[token.length - 1] !== ':' && isNaN(parseFloat(token)) && token !== 'true' && token !== 'false');
		const grams = trigrams ? _trigrams(noproperties) : [];
		const compressed = compressions ? noproperties.map(stem => _compress(stem)) : [];
		const results = [];

		for(const word of stemmed.concat(grams).concat(compressed).concat(other)) {
			if(!stops[word]) {
				const node = await get(word),
					isboolean = word==="false" || word==="true",
					isnumber = !isNaN(parseFloat(word));
				if(node) {
					Object.keys(node).forEach(id => {
						if(!results[id]) {
							results[id] = {
								score: 0,
								count: 0,
								stems: {},
								trigrams: {},
								compressions: {},
								booleans: {},
								numbers: {}
							};
						}
						let count = 0;
						if(isboolean) {
							if(!results[id].booleans[word]) {
								results[id].booleans[word] = 0;
							}
							results[id].booleans[word] += node[id].booleans;
							results[id].score += node[id].booleans;
							count = 1;
						}
						if(isnumber) {
							if(!results[id].numbers[word]) {
								results[id].numbers[word] = 0;
							}
							results[id].numbers[word] += node[id].numbers;
							results[id].score += node[id].numbers;
							count = 1;
						}
						if(stems && stemmed.includes(word)) {
							if(!results[id].stems[word]) {
								results[id].stems[word] = 0;
							}
							results[id].stems[word] += node[id].stems;
							results[id].score += node[id].stems;
							count = 1;
						}
						if(trigrams && grams.includes(word)) {
							if(!results[id].trigrams[word]) {
								results[id].trigrams[word] = 0
							}
							const score = node[id].trigrams * .5;
							results[id].trigrams[word] += score;
							results[id].score += score;
						}
						if(compressions && compressed.includes(word)) {
							if(!results[id].compressions[word]) {
								results[id].compressions[word] = 0;
							}
							const score = node[id].compressions * .75;
							results[id].compressions[word] += score;
							results[id].score += score;
							count || (count = 1);
						}
						results[id].count += count;
					});
				}
			}
		}

		const properties = type === 'object' ? Object.keys(objectOrText) : [];

		return Object.keys(results)
			.reduce((accum, id) => {
				const result = results[id];
				if (result.score > 0) {
					// if matching an object, 
					// find at least one top level matching property name
					// and a matched value
					const method = all ? 'every' : 'some';
					if (type === 'object') {
						if (properties[method](property => {
							if (result.stems[property + ':']) {
								const value = objectOrText[property];
								if (value === '_*_') return true;
								if (value == 'true' || value == 'false') {
									if (result.booleans[value]) return true;
								} else if (typeof (value) === 'number') {
									if (result.numbers[value]) return true;
								} else {
									const stemmed = _tokenize(value).map(token => _stemmer(token));
									return stemmed.some(stem => result.stems[stem]);
								}
							}
						})) {
							accum.push(Object.assign({ id: _coerceId(id) }, result));
						}
					} else if (all) {
						if (stems && Object.keys(result.stems).length === 0 && Object.keys(result.numbers).length === 0 && Object.keys(result.booleans).length === 0) return accum;
						if (trigrams && Object.keys(result.trigrams).length === 0) return accum;
						if (compressions && Object.keys(result.compressions).length === 0) return accum;
						accum.push(Object.assign({ id: _coerceId(id) }, result));
					} else {
						accum.push(Object.assign({ id: _coerceId(id) }, result));
					}
				}
				return accum;
			}, [])
			.sort((a, b) => b.score - a.score);
	}
};
	
module.exports = Txi;