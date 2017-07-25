//
//=== Import Required Modules ==================================================
//

// import the module under test
const CachingDatabridge = require('../');

// import validateParams for access to the error prototype
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

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

QUnit.test('class exists', function(a){
    a.equal(typeof CachingDatabridge, 'function');
});