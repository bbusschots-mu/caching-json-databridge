//
//=== Import Required Modules ==================================================
//

// import the module under test
const Databridge = require('../');

// import validateParams for access to the error prototype and other utilities
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

// import file system support - use fs-extra to avoid adding extra dependencies
const fs = require('fs-extra');

//
//=== Test Suite Setup =========================================================
//

/**
 * The path to the dummy cache dir used during testing
 */
const CACHEDIR = './databridgeJsonCache';

// add an event handler to empty the cache dir each time the test suite runs
QUnit.begin(function(){
    fs.emptyDirSync(CACHEDIR);
});


//
//=== Utility Variables & Functions ============================================
//

/**
 * An object containing dummy data. The pieces of dummy data are indexed by
 * names, and each peice of dummy data is itself an object indexed by `desc` (a
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
 * A function to return the names of all dummy asic types not explicitly
 * excluded.
 *
 * @param {...string} typeName - the names of the types to exclide from the
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

QUnit.module('The Databridge class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('building default object', function(a){
            a.expect(3);
            var db = new Databridge();
            a.ok(db instanceof Databridge, 'object successfully constructed without args');
            a.strictEqual(db._options.cacheDir, CACHEDIR, 'cache dir defaulted to expected value');
            a.strictEqual(db._options.defaultCacheTTL, 3600, 'default cache TTL defaulted to expected value');
        });
        
        QUnit.test('specified options correctly stored', function(a){
            a.expect(2);
            var testPath = './';
            var testTTL = 300;
            var db = new Databridge({cacheDir: testPath, defaultCacheTTL: testTTL});
            a.strictEqual(db._options.cacheDir, testPath, 'cache dir correctly stored');
            a.strictEqual(db._options.defaultCacheTTL, testTTL, 'default cache TTL correctly stored');
        });
        
        QUnit.test('._datasources correctly initialised', function(a){
            a.expect(1);
            var db = new Databridge();
            a.deepEqual(db._datasources, {});
        });
    });
    
    QUnit.module('.option() read-only accessor',
        {
            beforeEach: function(){
                this.db = new Databridge({ cacheDir: './', defaultCacheTTL: 500 });
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
        '.registerDatasource() instance method',
        {
            beforeEach: function(){
                this.db = new Databridge({ cacheDir: './' });
                this.ds = new Databridge.Datasource('testDS', function(){ return true; });
            }
        },
        function(){
            QUnit.test('function exists', function(a){
                a.equal(typeof this.db.registerDatasource, 'function');
            });
            
            QUnit.test('name clashes prevented', function(a){
                a.expect(2);
                this.db.registerDatasource(this.ds);
                a.throws(
                    function(){
                        this.db.registerDatasource(new Databridge.Datasource('testDS', function(){}));
                    },
                    Error,
                    'clashing datasource name rejected'
                );
                a.throws(
                    function(){
                        this.db.registerDatasource(new Databridge.Datasource('option', function(){}));
                    },
                    Error,
                    'datasource name that clashes with instance method name rejected'
                );
            });
            
            QUnit.test('function chanining supported', function(a){
                a.strictEqual(this.db.registerDatasource(this.ds), this.db);
            });
            
            QUnit.test('source correctly registered', function(a){
                a.expect(1);
                this.db.registerDatasource(this.ds);
                a.strictEqual(this.db._datasources[this.ds.name()], this.ds, 'datasource saved in ._datasources property with correct name');
                // TO DO - check the bound shortcut when support is added for that later
            });
        }
    );
});

QUnit.module('The Databridge.Datasource class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge.Datasource, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments & defaults', function(a){
            a.expect(6);
            a.throws(
                function(){
                    new Databridge.Datasource();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.throws(
                function(){
                    new Databridge.Datasource('test');
                },
                validateParams.ValidationError,
                'throws error when only a name is passed'
            );
            var defDS = new Databridge.Datasource('test', function(){});
            a.ok(defDS, 'no error thrown when passed both a name and a callback but no options');
            a.strictEqual(defDS._options.enableCaching, true, 'caching enabled by default');
            a.strictEqual(typeof defDS._options.cacheTTL, 'undefined', 'no custom cache TTL set by default');
            a.ok(new Databridge.Datasource('test', function(){}, {cacheTTL: 300}), 'no error thrown when passed both a name, a callback, and options');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(4);
            var testName = 'test';
            var testFn = function(){ return true; };
            var testTTL = 500;
            var testCacheEnable = false;
            var ds = new Databridge.Datasource(testName, testFn, {cacheTTL: testTTL, enableCaching: testCacheEnable});
            a.strictEqual(ds._name, testName, 'name successfully stored');
            a.strictEqual(ds._dataFetcher, testFn, 'data fether callback successfully stored');
            a.strictEqual(ds._options.enableCaching, testCacheEnable, 'cache enabling option successfully stored');
            a.strictEqual(ds._options.cacheTTL, testTTL, 'cache TTL option successfully stored');
        });
    });
    
    QUnit.module(
        'read-only accessors',
        {
            beforeEach: function(){
                this.df = function(){ return true; };
                this.ds = new Databridge.Datasource('test', this.df, { enableCaching: true, cacheTTL: 300 });
            }
        },
        function(){
            QUnit.test('.name() exists', function(a){
                a.ok(validate.isFunction(this.ds.name));
            });
            
            QUnit.test('.name() returns expected value', function(a){
                a.strictEqual(this.ds.name(), 'test');
            });
            
            QUnit.test('.dataFetcher() exists', function(a){
                a.ok(validate.isFunction(this.ds.dataFetcher));
            });
            
            QUnit.test('.dataFetcher() returns expected value', function(a){
                a.strictEqual(this.ds.dataFetcher(), this.df);
            });
            
            QUnit.test('.option() exists', function(a){
                a.ok(validate.isFunction(this.ds.option));
            });
            
            QUnit.test('.option() returns expected values', function(a){
                a.expect(2);
                a.strictEqual(this.ds.option('cacheTTL'), 300, 'expected value returned for defined option');
                a.strictEqual(typeof this.ds.option('thingy'), 'undefined', 'undefined returned for un-specified option');
            });
        }
    );
});