/**
 * @file Provides the NodeJS module
 * [databridge-caching]{@link module:@maynoothuniversity/databridge-caching}. The
 * module is exported as the JavaScript prototype/class
 * [CachingDatabridge]{@link module:@maynoothuniversity/databridge-caching~CachingDatabridge}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.1
 * @see {@link https://github.com/bbusschots-mu/databridge-caching}
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
class CachingDatabridge{
    constructor(){
    }
}


//
//=== Export the CachingDatabridge class as the module =========================
//
module.exports = CachingDatabridge;