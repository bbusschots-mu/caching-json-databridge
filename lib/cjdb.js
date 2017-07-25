/**
 * @file Provides the NodeJS module
 * [caching-json-databridge]{@link module:@maynoothuniversity/caching-json-databridge}. The
 * module is exported as the JavaScript prototype/class
 * [Databridge]{@link module:@maynoothuniversity/caching-json-databridge~Databridge}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.1
 * @see {@link https://github.com/bbusschots-mu/caching-json-databridge}
 */

// import requirements
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();
const fs = require('fs-extra');

//
//=== Define The Main Class ====================================================
//

/**
 * A class representing a data bridge with an associated cache.
 */
class Databridge{
    constructor(){
    }
}


//
//=== Export the CachingDatabridge class as the module =========================
//
module.exports = Databridge;