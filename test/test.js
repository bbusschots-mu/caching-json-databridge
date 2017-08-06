//
//=== Import Required Modules ==================================================
//

// import the module under test
const cjdb = require('../');

// import validateParams for access to the error prototype and other utilities
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

// import file system support - use fs-extra to avoid adding extra dependencies
const fs = require('fs-extra');
const path = require('path');

// import time handling support - needed for testing timestamps
const moment = require('moment');

//
//=== Test Suite Setup =========================================================
//

/**
 * The path to the dummy cache dir used during testing
 */
const CACHEDIR_NAME = 'databridgeJsonCache';
const CACHEDIR_RELATIVE = path.join('.', CACHEDIR_NAME);
const CACHEDIR_ABSOLUTE = path.resolve(__dirname, CACHEDIR_RELATIVE);

// add an event handler to empty the cache dir each time the test suite runs
QUnit.begin(function(){
    fs.emptyDirSync(CACHEDIR_ABSOLUTE);
});


//
//=== Utility Variables & Functions ============================================
//

/**
 * An object containing dummy data. The pieces of dummy data are indexed by
 * names, and each piece of dummy data is itself an object indexed by `desc` (a
 * description) and `val` (the dummy value).
 *
 * This object is re-built before each test
 * 
 * @type {Object.<string, {desc: string, val: *}>}
 */
var DUMMY_DATA = {};

/**
 * An object just like {@link DUMMY_DATA}, but limited to just the basic types
 * returned by typeof.
 * 
 * @see DUMMY_DATA
 */
var DUMMY_BASIC_TYPES = {};

// add a callback to reset the dummy data before each test
QUnit.testStart(function() {
    DUMMY_DATA = {
        undef: {
            desc: 'undefined',
            val: undefined
        },
        bool: {
            desc: 'a boolean',
            val: true
        },
        num: {
            desc: 'a number',
            val: 42,
        },
        str_empty: {
            desc: 'an empty string',
            val: ''
        },
        str: {
            desc: 'a generic string',
            val: 'boogers!'
        },
        arr_empty: {
            desc: 'an emptyy array',
            val: [],
        },
        arr: {
            desc: 'an array',
            val: [1, 2, 3],
        },
        obj_empty: {
            desc: 'an empty plain object',
            val: {},
        },
        obj: {
            desc: 'a plain object',
            val: {b: 'boogers'}
        },
        obj_proto: {
            desc: 'a prototyped object',
            val: new Error('dummy error object')
        },
        fn: {
            desc: 'a function object',
            val: function(a,b){ return a + b; }
        }
    };
    DUMMY_BASIC_TYPES = {
        undef: DUMMY_DATA.undef, 
        bool: DUMMY_DATA.bool,
        num: DUMMY_DATA.num,
        str: DUMMY_DATA.str,
        arr: DUMMY_DATA.arr,
        obj: DUMMY_DATA.obj,
        fn: DUMMY_DATA.fn
    };
});

/**
 * A function to return a dummy value given a type name, i.e. an index on
 * {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {*} the `val` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyVal(typeName){
    return DUMMY_DATA[typeName].val;
}

/**
 * A function to return the description of a dummy value given a type name, i.e.
 * an index on {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {string} the `desc` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyDesc(typeName){
    return DUMMY_DATA[typeName].desc;
}

/**
 * A function to return the names of all dummy basic types not explicitly
 * excluded.
 *
 * @param {...string} typeName - the names of the types to exclude from the
 * returned list.
 * @returns Array.<string> the names of all the dummy basic types except those
 * excluded by the passed arguments as an array of strings.
 */
function dummyBasicTypesExcept(){
    // build and exclusion lookup from the arguments
    var exclude_lookup = {};
    for(var i = 0; i < arguments.length; i++){
        exclude_lookup[arguments[i]] = true;
    }
    
    // build the list of type names not excluded
    var ans = [];
    Object.keys(DUMMY_BASIC_TYPES).sort().forEach(function(tn){
        if(!exclude_lookup[tn]){
            ans.push(tn); // save the type name if not excluded
        }
    });
    
    // return the calculated list
    return ans;
}

//
//=== Define Tests =============================================================
//

QUnit.module('custom validators', {}, function(){
    QUnit.test('custom validators registered', function(a){
        a.expect(3);
        a.strictEqual(typeof validate.validators.folderExists, 'function', 'folderExists is registered');
        a.strictEqual(typeof validate.validators.iso8601, 'function', 'iso8601 is registered');
		a.strictEqual(typeof validate.validators.dataFetcher, 'function', 'dataFetcher is registered');
    });
    
    QUnit.test('the folderExists validator', function(a){
        a.expect(4);
        a.strictEqual(typeof validate.validators.folderExists(undefined, true), 'undefined', 'undefined passes');
        a.ok(!validate.isDefined(validate.validators.folderExists(path.join(__dirname, '..', 'lib'), true)), 'existing folder passes');
        a.ok(validate.isString(validate.validators.folderExists('/thingys', true)), 'non-existing path returns error message');
        a.ok(validate.isString(validate.validators.folderExists('./package.jason', true)), 'path to file returns error message');
    });
    
    QUnit.test('the iso8601 validator', function(a){
        a.expect(5);
        a.strictEqual(typeof validate.validators.iso8601(undefined, true), 'undefined', 'undefined passes');
        a.strictEqual(typeof validate.validators.iso8601('', true), 'undefined', 'empty string passes');
        a.ok(!validate.isDefined(validate.validators.iso8601('2017-07-27T10:28:53', true)), 'valid date passes');
        a.ok(validate.isString(validate.validators.iso8601('thingys', true)), 'invalid date return error message');
        a.ok(validate.isString(validate.validators.iso8601(42, true)), 'non-string returns error message');
    });
    
    //QUnit.test('the promise validator', function(a){
    //    a.expect(4);
    //    a.strictEqual(typeof validate.validators.promise(undefined, true), 'undefined', 'undefined passes');
    //    a.ok(validate.isDefined(validate.validators.promise('', true)), 'empty string returns error message');
    //    a.ok(!validate.isDefined(validate.validators.promise(Promise.resolve(true), true)), 'a resolved promise passes');
    //    a.ok(!validate.isDefined(validate.validators.promise(Promise.reject(new Error('test')), true)), 'a rejected promise passes');
    //});
	
	QUnit.test('the dataFetcher validator', function(a){
        a.expect(11);
        a.strictEqual(typeof validate.validators.dataFetcher(undefined, true), 'undefined', 'undefined passes');
        a.ok(!validate.isDefined(validate.validators.dataFetcher(function(){}, true)), 'a callback passes');
		a.ok(!validate.isDefined(validate.validators.dataFetcher({}, true)), 'an empty plain object passes');
		a.ok(!validate.isDefined(validate.validators.dataFetcher({main: function(){}}, true)), 'a plain object defining a single callback passes');
		a.ok(!validate.isDefined(validate.validators.dataFetcher({main: function(){}, math: {add: function(){}}}, true)), 'a nested plain object defining multiple callbacks passes');
		a.ok(validate.isString(validate.validators.dataFetcher('thingys', true)), 'a string returns an error message');
		a.ok(validate.isString(validate.validators.dataFetcher(new Date(), true)), 'a prototyped object returns an error message');
		a.ok(validate.isString(validate.validators.dataFetcher({'thingys-whatsists': function(){}}, true)), 'a plain object with an invalid key returns an error message');
		a.ok(validate.isString(validate.validators.dataFetcher({thingys: {'whatsits-thing': function(){}}}, true)), 'a plain object with a nested invalid key returns an error message');
		a.ok(validate.isString(validate.validators.dataFetcher({thingys: 'whatsists'}, true)), 'a plain object with an invalid value returns an error message');
		a.ok(validate.isString(validate.validators.dataFetcher({thingys: {whatsists: 'stuff'}}, true)), 'a plain object with a nested invalid value returns an error message');
    });
});

QUnit.module('The Databridge class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof cjdb.Databridge, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('building default object', function(a){
            a.expect(3);
            let db = new cjdb.Databridge();
            a.ok(db instanceof cjdb.Databridge, 'object successfully constructed without args');
            a.strictEqual(db._options.cacheDir, path.join('.', CACHEDIR_NAME), 'cache dir defaulted to expected value');
            a.strictEqual(db._options.defaultCacheTTL, 3600, 'default cache TTL defaulted to expected value');
        });
        
        QUnit.test('specified options correctly stored', function(a){
            a.expect(2);
            let testPath = './';
            let testTTL = 300;
            let db = new cjdb.Databridge({cacheDir: testPath, defaultCacheTTL: testTTL});
            a.strictEqual(db._options.cacheDir, testPath, 'cache dir correctly stored');
            a.strictEqual(db._options.defaultCacheTTL, testTTL, 'default cache TTL correctly stored');
        });
        
        QUnit.test('._datasources correctly initialised', function(a){
            a.expect(1);
            var db = new cjdb.Databridge();
            a.deepEqual(db._datasources, {});
        });
    });
    
    QUnit.module('.option() read-only accessor',
        {
            beforeEach: function(){
                this.db = new cjdb.Databridge({ cacheDir: './', defaultCacheTTL: 500 });
            }
        },
        function(){
            QUnit.test('function exists', function(a){
                a.ok(validate.isFunction(this.db.option));
            });
            
            QUnit.test('defined option returns as expected', function(a){
                a.strictEqual(this.db.option('defaultCacheTTL'), 500);
            });
            
            QUnit.test('non-existent option returns undefined', function(a){
                a.strictEqual(typeof this.db.option('thingy'), 'undefined');
            });
        }
    );
    
    QUnit.module(
        '.registerDatasource() & .datasource() instance methods',
        {
            beforeEach: function(){
                this.db = new cjdb.Databridge({ cacheDir: './' });
                this.ds = new cjdb.Datasource(function(){ return true; });
            }
        },
        function(){
            QUnit.test('methods exist', function(a){
                a.expect(4);
                a.equal(typeof this.db.registerDatasource, 'function', '.registerDatasource() exists');
                a.strictEqual(this.db.register, this.db.registerDatasource, '.register() is an alias for .registerDatasource()');
                a.equal(typeof this.db.datasource, 'function', '.datasource() exists');
                a.strictEqual(this.db.source, this.db.datasource, '.source() is an alias for .datasource()');
            });
            
            QUnit.test('name clashes prevented on registration', function(a){
                a.expect(2);
                this.db.registerDatasource('testDS', this.ds);
                a.throws(
                    function(){
                        this.db.registerDatasource('testDS', new cjdb.Datasource(function(){}));
                    },
                    Error,
                    'clashing datasource name rejected'
                );
                a.throws(
                    function(){
                        this.db.registerDatasource('option', new cjdb.Datasource(function(){}));
                    },
                    Error,
                    'datasource name that clashes with instance method name rejected'
                );
            });
            
            QUnit.test('function chanining supported by registration function', function(a){
                a.strictEqual(this.db.registerDatasource('testDS', this.ds), this.db);
            });
            
            QUnit.test('source correctly registered & fetched', function(a){
                a.expect(3);
                this.db.registerDatasource('testDS', this.ds);
                a.strictEqual(this.db._datasources.testDS, this.ds, 'datasource saved in ._datasources property with correct name');
                a.strictEqual(typeof this.db.testDS, 'function', 'shortcut function added for datasource');
                a.strictEqual(this.db.datasource('testDS'), this.ds, 'datasource retrieved with .datasource() accessor');
            });
            
            QUnit.test('.datasource() returns undefined for unregistered sources', function(a){
                a.strictEqual(typeof this.db.datasource('thingys'), 'undefined');
            });
            
            QUnit.test('.source() is a shortcut to .datasource()', function(a){
                a.strictEqual(this.db.source, this.db.datasource);
            });
        }
    );
    
    QUnit.module('data fetching and caching',
        {
            beforeEach: function(){
                this.db = new cjdb.Databridge({cacheDir: CACHEDIR_ABSOLUTE});
                let dummyData = ['thingys', 'whatsitis'];
                this.dummyData = dummyData;
                this.dsName = 'testDS';
                this.ds = new cjdb.Datasource(function(){ return dummyData; }, {enableCaching: false});
                this.db.registerDatasource(this.dsName, this.ds);
            }
        },
        function(){
            QUnit.test('fetch instance methods exist', function(a){
                a.expect(3);
                var db = new cjdb.Databridge();
                a.ok(validate.isFunction(db.fetchResponse), '.fetchResponse() exists');
                a.ok(validate.isFunction(db.fetchDataPromise), '.fetchDataPromise() exists');
                a.strictEqual(db.fetch, db.fetchResponse, '.fetch() is an alias to .fetchResponse()');
            });
        
            QUnit.test('.fetchResponse() from data source that returns immediately with caching disabled', function(a){
                a.expect(3);
                
                var dummyData = this.dummyData;
                var done = a.async();
                var fr = this.db.fetchResponse(this.dsName, {}, []);
                a.ok(fr instanceof cjdb.FetchResponse, 'a FetchResponse object returned');
                a.ok(validate.isPromise(fr.dataPromise()), 'the response object contains a data promise');
                if(validate.isPromise(fr.dataPromise())){
                    fr.dataPromise().then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolves to expected value');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
            
            QUnit.test('.fetchDataPromise() from data source that returns immediately with caching disabled', function(a){
                a.expect(2);
                
                var dummyData = this.dummyData;
                var done = a.async();
                var dp = this.db.fetchDataPromise(this.dsName, {}, []);
                a.ok(validate.isPromise(dp), 'returns a promise');
                if(validate.isPromise(dp)){
                    dp.then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolves to expected value');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
            
            QUnit.test('cache writting', function(a){
                a.expect(7);
                
                var dummyData = this.dummyData;
                var cachingDS = new cjdb.Datasource(function(){ return dummyData; });
                this.db.register('testCachingDS', cachingDS);
                var done = a.async();
                
                var fr = this.db.fetchResponse('testCachingDS', {}, []);
                a.ok(validate.isPromise(fr.dataPromise()), 'the response object contains a data promise');
                if(validate.isPromise(fr.dataPromise())){
                    fr.dataPromise().then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolved to expected value');
                            a.ok(validateParams.isPlainObject(fr.meta('cacheWrite')), 'cacheWrite metadata is a plain object');
                            a.ok(validate.isString(fr.meta('cacheWrite').path), 'cacheWrite.path metadata is a string');
                            a.ok(fs.existsSync(fr.meta('cacheWrite').path), 'cache file exists on disk');
                            a.notOk(validate.single(fr.meta('cacheWrite').timestamp, { presence: true, iso8601: true }),'cacheWrite.timestamp metadata is an ISO8601 string');
                            a.deepEqual(fs.readJsonSync(fr.meta('cacheWrite').path).data, dummyData, 'correct data cached');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
            
            QUnit.test('cache reading & bypassing', function(a){
                a.expect(10);
                
                // prep the data source
                let db = this.db;
                let dummyData = this.dummyData;
                let dsName = 'cacheTest' + moment().unix(); // make sure it's unique each time
                let cachingDS = new cjdb.Datasource(function(){ return dummyData; });
                db.register(dsName, cachingDS);
                
                // start async mode
                let done = a.async();
                
                // fetch the data from the source once bypassing the cache so a fresh copy can be written to the cache
                let fr1 = db.fetchResponse(dsName, { bypassCache: true }, []);
                if(validate.isPromise(fr1.dataPromise())){
                    fr1.dataPromise().then(
                        function(){
                            // check the cache was written OK
                            a.ok(validateParams.isPlainObject(fr1.meta('cacheWrite')), 'data cached in prep for test retrieval');
                            let cachePath = fr1.meta('cacheWrite').path;
                            a.ok(validate.isString(cachePath) && !validate.isEmpty(cachePath), 'cache path included in response meta');
                            a.ok(fs.existsSync(cachePath), 'cache file exists on disk');
                            
                            // make a second call to try retrieve the data from the cache
                            let fr2 = db.fetchResponse(dsName, {}, []);
                            if(validate.isPromise(fr2.dataPromise())){
                                fr2.dataPromise().then(
                                    function(data){
                                        a.ok(validateParams.isPlainObject(fr2.meta('cacheRead')), 'data read from cache');
                                        a.ok(validate.isString(fr2.meta('cacheRead').path), 'cacheRead.path metadata is a string');
                                        a.ok(fs.existsSync(fr2.meta('cacheRead').path), 'cacheRead.path points to a file that exists on disk');
                                        a.notOk(validate.single(fr2.meta('cacheRead').timestamp, { presence: true, iso8601: true }),'cacheRead.timestamp metadata is an ISO8601 string');
                                        a.deepEqual(data, dummyData, 'correct data read from cache');
                                        
                                        // make a third call to try bypass the valid cache
                                        let fr3 = db.fetchResponse(dsName, { bypassCache: true }, []);
                                        if(validate.isPromise(fr3.dataPromise())){
                                            fr3.dataPromise().then(
                                                function(data){
                                                    a.notOk(validateParams.isPlainObject(fr3.meta('cacheRead')), 'data not read from cache');
                                                    a.deepEqual(data, dummyData, 'correct data retrieved');
                                                    done();
                                                },
                                                function(err){
                                                    console.error('data promise in third call rejected with error', err);
                                                    done();
                                                }
                                            );
                                        }else{
                                            console.error('third call did not return a data promise');
                                            done();
                                        }
                                    },
                                    function(err){
                                        console.error('data promise in second call rejected with error', err);
                                        done();
                                    }
                                );
                            }else{
                                console.error('second call did not return a data promise');
                                done();
                            }
                        },
                        function(err){
                            console.error('data promise in first call rejected with error', err);
                            done();
                        }
                    );
                }else{
                    console.error('first call did not return a data promise');
                    done();
                }
            });
        }
    );
});

QUnit.module('The Datasource class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof cjdb.Datasource, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('defaults', function(a){
            a.expect(5);
            let defDS = new cjdb.Datasource();
            a.ok(defDS, 'no error thrown when passed no parameters');
			a.deepEqual(defDS._dataFetcher, {}, 'data fetcher defaults to empty plain object');
            a.strictEqual(defDS._options.enableCaching, true, 'caching enabled by default');
            a.strictEqual(typeof defDS._options.cacheTTL, 'undefined', 'no custom cache TTL set by default');
            a.ok(new cjdb.Datasource(function(){}, {cacheTTL: 300}), 'no error thrown when passed both a callback and options');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(3);
            var testFn = function(){ return true; };
            var testTTL = 500;
            var testCacheEnable = false;
            var ds = new cjdb.Datasource(testFn, {cacheTTL: testTTL, enableCaching: testCacheEnable});
            a.strictEqual(ds._dataFetcher, testFn, 'data fether callback successfully stored');
            a.strictEqual(ds._options.enableCaching, testCacheEnable, 'cache enabling option successfully stored');
            a.strictEqual(ds._options.cacheTTL, testTTL, 'cache TTL option successfully stored');
        });
    });
	
	QUnit.module('read-only accessor .dataFetcher()', {}, function(){
		QUnit.test('function exists', function(a){
			a.expect(1);
			let ds = new cjdb.Datasource(function(){});
            a.ok(validate.isFunction(ds.dataFetcher));
        });
		
		QUnit.module('single callback case',
			{
				beforeEach: function(){
					this.df = function(){ return true; };
					this.ds = new cjdb.Datasource(this.df, { enableCaching: false });
				}
			},
			function(){
				QUnit.test('returns expected value', function(a){
					a.expect(2);
					a.strictEqual(this.ds.dataFetcher(), this.df, 'expected value returned with no params');
					a.strictEqual(this.ds.dataFetcher([]), this.df, 'expected value returned with empty array as first param');
				});
				
				QUnit.test('throws Error when passed name path', function(a){
					a.expect(4);
					a.throws(
						function(){ this.ds.dataFetcher('thingy'); },
						Error,
						'error on single string'
					);
					a.throws(
						function(){ this.ds.dataFetcher('thingy', 'stuff'); },
						Error,
						'error on multiple strings'
					);
					a.throws(
						function(){ this.ds.dataFetcher(['thingy']); },
						Error,
						'error on single string array'
					);
					a.throws(
						function(){ this.ds.dataFetcher(['thingy', 'stuff']); },
						Error,
						'error on multiple string array'
					);
				});
			}
		);
		
		QUnit.module('flat multiple callbacks case',
			{
				beforeEach: function(){
					this.dfCol = {
						cb1: function(){ return true; },
						cb2: function(){ return false; }
					};
					this.ds = new cjdb.Datasource(this.dfCol, { enableCaching: false });
				}
			},
			function(){
				QUnit.test('returns expected values', function(a){
					a.expect(5);
					a.strictEqual(this.ds.dataFetcher(), this.dfCol, 'returns entire datastructure when passed no params');
					a.strictEqual(this.ds.dataFetcher('cb1'), this.dfCol.cb1, 'returns correct callback when passed single string');
					a.strictEqual(this.ds.dataFetcher(['cb1']), this.dfCol.cb1, 'returns correct callback when passed array contianing single string');
					a.throws(
						() => this.ds.dataFetcher('cb3'),
						Error,
						'throws error when passed name that does not map to a callback as single string'
					);
					a.throws(
						() => this.ds.dataFetcher(['cb3']),
						Error,
						'throws error when passed name that does not map to a callback as array containing single string'
					);
				});
			}
		);
		
		QUnit.module('nested multiple callbacks case',
			{
				beforeEach: function(){
					this.dfCol = {
						cb1: {
							cb1a: function(){ return true; },
							cb1b: function(){ return null; }
						},
						cb2: function(){ return false; }
					};
					this.ds = new cjdb.Datasource(this.dfCol, { enableCaching: false });
				}
			},
			function(){
				QUnit.test('returns expected values', function(a){
					a.expect(9);
					a.strictEqual(this.ds.dataFetcher(), this.dfCol, 'returns entire datastructure when passed no params');
					a.strictEqual(this.ds.dataFetcher('cb1'), this.dfCol.cb1, 'returns correct sub-data-structure when passed single string');
					a.strictEqual(this.ds.dataFetcher(['cb1']), this.dfCol.cb1, 'returns correct sub-data-structure when passed array contianing single string');
					a.strictEqual(this.ds.dataFetcher('cb1', 'cb1a'), this.dfCol.cb1.cb1a, 'returns correct callback when passed two strings');
					a.strictEqual(this.ds.dataFetcher(['cb1', 'cb1a']), this.dfCol.cb1.cb1a, 'returns correct callback when passed array contianing two strings');
					a.throws(
						() => this.ds.dataFetcher('cb3'),
						Error,
						'throws error when passed name that does not map to a callback at the top level as a single string'
					);
					a.throws(
						() => this.ds.dataFetcher(['cb3']),
						Error,
						'throws error when passed name that does not map to a callback at the top level as array containing single string'
					);
					a.throws(
						() => this.ds.dataFetcher('cb1', 'cb1c'),
						Error,
						'throws error when passed name that does not map to a callback at the second level as a single string'
					);
					a.throws(
						() => this.ds.dataFetcher(['cb1', 'cb1c']),
						Error,
						'throws error when passed name that does not map to a callback at the second level as array containing single string'
					);
				});
			}
		);
	});
    
    QUnit.module(
        'read-only accessor .option()',
        {
            beforeEach: function(){
                this.df = function(){ return true; };
                this.ds = new cjdb.Datasource(this.df, { enableCaching: true, cacheTTL: 300 });
            }
        },
        function(){
            
            QUnit.test('function exists', function(a){
                a.ok(validate.isFunction(this.ds.option));
            });
            
            QUnit.test('returns expected values', function(a){
                a.expect(2);
                a.strictEqual(this.ds.option('cacheTTL'), 300, 'expected value returned for defined option');
                a.strictEqual(typeof this.ds.option('thingy'), 'undefined', 'undefined returned for un-specified option');
            });
        }
    );
    
    QUnit.test('data fetching', function(a){
        a.expect(1);
        
        //var db = new Databridge();
        var dummyData = { a: 'b', c: 'd' };
        var ds = new cjdb.Datasource(function(){ return dummyData; });
        var done = a.async();
        var dp = ds.fetchDataPromise();
        dp.then(
            function(d){
                a.deepEqual(d, dummyData, 'promise resolved to expected value');
                done();
            },
            function(){
                done();
            }
        );
    });
});

QUnit.module('The FetchRequest class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof cjdb.FetchRequest, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments', function(a){
            a.expect(6);
            var db = new cjdb.Databridge();
            var ds = new cjdb.Datasource(function(){ return true; });
            a.throws(
                function(){
                    new cjdb.FetchRequest();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.throws(
                function(){
                    new cjdb.FetchRequest(db);
                },
                validateParams.ValidationError,
                'throws error when only a bridge is passed'
            );
            a.throws(
                function(){
                    new cjdb.FetchRequest(db, ds);
                },
                validateParams.ValidationError,
                'throws error when only a bridge and source are passed'
            );
            a.throws(
                function(){
                    new cjdb.FetchRequest(db, ds, {});
                },
                validateParams.ValidationError,
                'throws error when only a bridge, source, and options are passed'
            );
            a.throws(
                function(){
                    new cjdb.FetchRequest(db, ds, {}, []);
                },
                validateParams.ValidationError,
                'throws error when only a bridge, source, options, and params are passed'
            );
            a.ok(new cjdb.FetchRequest(db, ds, {}, [], moment().toISOString()), 'no error thrown when passed all params');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(5);
            var db = new cjdb.Databridge();
            var ds = new cjdb.Datasource(function(){ return true; });
            var opts = { enableCaching: true };
            var params = [true];
            var ts = moment().toISOString();
            var fr = new cjdb.FetchRequest(db, ds, opts, params, ts);
            a.strictEqual(fr._bridge, db, 'databridge successfully stored');
            a.strictEqual(fr._source, ds, 'datasource successfully stored');
            a.strictEqual(fr._fetchOptions, opts, 'fetch options successfully stored');
            a.strictEqual(fr._fetcherParams, params, 'fetcher parans successfully stored');
            a.strictEqual(fr._timestamp, ts, 'timestamp successfully stored');
        });
    });
    
    QUnit.module(
        'read-only accessors',
        {
            beforeEach: function(){
                this.db = new cjdb.Databridge();
                this.ds = new cjdb.Datasource(function(){ return true; });
                this.opts = { cacheTTL: 300 };
                this.params = [true];
                this.ts = moment().toISOString();
                this.fr = new cjdb.FetchRequest(this.db, this.ds, this.opts, this.params, this.ts);
            }
        },
        function(){
            QUnit.test('.databridge() & .bridge()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.databridge), '.databridge() exists');
                a.strictEqual(this.fr.databridge(), this.db, 'returns expected value');
                a.strictEqual(this.fr.databridge, this.fr.bridge, '.bridge() is alias for .databridge()');
            });
            
            QUnit.test('.datasource() & .source()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.datasource), '.datasource() exists');
                a.strictEqual(this.fr.datasource(), this.ds, 'returns expected value');
                a.strictEqual(this.fr.datasource, this.fr.source, '.source() is alias for .datasource()');
            });
            
            QUnit.test('.fetchOptions() & .options()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.fetchOptions), '.fetchOptions() exists');
                a.strictEqual(this.fr.fetchOptions(), this.opts, 'returns expected value');
                a.strictEqual(this.fr.fetchOptions, this.fr.options, '.options() is alias for .fetchOptions()');
            });
            
            QUnit.test('.fetcherParams() & .params()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.fetcherParams), '.fetcherParams() exists');
                a.strictEqual(this.fr.fetcherParams(), this.params, 'returns expected value');
                a.strictEqual(this.fr.fetcherParams, this.fr.params, '.params() is alias for .fetcherParams()');
            });
            
            QUnit.test('.timestamp()', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fr.timestamp), '.timestamp() exists');
                a.strictEqual(this.fr.timestamp(), this.ts, 'returns expected value');
            });
        }
    );
});

QUnit.module('The FetchResponse class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof cjdb.FetchResponse, 'function');
    });
    
    // NOTE - not testing dataPromise because that would mean the tests have to be async.
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments', function(a){
            a.expect(3);
            var db = new cjdb.Databridge();
            var ds = new cjdb.Datasource(function(){ return true; });
            var fr = new cjdb.FetchRequest(db, ds, {}, [], moment().toISOString());
            a.throws(
                function(){
                    new cjdb.FetchResponse();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.ok(new cjdb.FetchResponse(fr), 'no error thrown with all required params');
            a.ok(new cjdb.FetchResponse(fr, {}), 'no error thrown with required params and optional meta');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(2);
            var db = new cjdb.Databridge();
            var ds = new cjdb.Datasource(function(){ return true; });
            var freq = new cjdb.FetchRequest(db, ds, {}, [], moment().toISOString());
            var m = {};
            var fres = new cjdb.FetchResponse(freq, m);
            a.strictEqual(fres._request, freq, 'request successfully stored');
            a.strictEqual(fres._meta, m, 'meta data successfully stored');
        });
    });

    QUnit.module(
        'accessors',
        {
            beforeEach: function(){
                this.db = new cjdb.Databridge();
                this.ds = new cjdb.Datasource(function(){ return true; });
                this.freq = new cjdb.FetchRequest(this.db, this.ds, {}, [], moment().toISOString());
                this.m = { a: 'b' };
                this.fres = new cjdb.FetchResponse(this.freq, this.m);
            }
        },
        function(){
            QUnit.test('.request()', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fres.request), '.request() exists');
                a.strictEqual(this.fres.request(), this.freq, 'returns expected value');
            });
            
            QUnit.test('.dataPromise() R/W', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fres.dataPromise), '.dataPromise() exists');
                a.throws(
                    function(){
                        this.fres.dataPromise('thingy');
                    },
                    TypeError,
                    'throws an error when a non-promise is passed as an argument'
                );
            });
            
            QUnit.test('.meta() R/W', function(a){
                a.expect(5);
                a.ok(validate.isFunction(this.fres.meta), '.meta() exists');
                a.throws(
                    function(){
                        this.fres.meta();
                    },
                    validateParams.ValidationError,
                    'throws an error when called without args'
                );
                a.throws(
                    function(){
                        this.fres.meta(new Date());
                    },
                    validateParams.ValidationError,
                    'throws an error when called non-string first arg'
                );
                a.strictEqual(this.fres.meta('a'), 'b', 'returns expected value');
                a.strictEqual(this.fres.meta('a', 'c'), 'c', 'sets and returns expected value in setter mode');
            });
            
            QUnit.test('.allMeta()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fres.allMeta), '.allMeta() exists');
                a.deepEqual(this.fres.allMeta(), this.m, 'returns expected value');
                a.notStrictEqual(this.fres.allMeta(), this.m, 'returns shallow copy not reference');
            });
        }
    );
});