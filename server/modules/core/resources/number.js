'use strict';
//
//  number.js
//  process common number format
//
//  Created by thanhdh on 2016-01-15.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

/**
 * Number format(n, x, s, c)
 * @author: dientn
 *
 * @param integer
 *            number: length of decimal
 * @param integer
 *            n: length of decimal
 * @param integer
 *            x: length of whole part
 * @param mixed
 *            s: sections delimiter
 * @param mixed
 *            c: decimal delimiter
 */
exports.formatNumber = ( number, n, x, s, c ) =>{
    try {
        number = parseFloat( number );
    } catch ( ex ) {
        number = 0;
    }
    var re = "\\d(?=(\\d{" + ( x || 3 ) + "})+" + ( n > 0 ? "\\D" : "$" ) + ")", num = number.toFixed( Math.max( 0, ~~n ) );

    return ( c ? num.replace( ".", c ) : num ).replace( new RegExp( re, "g" ), "$&" + ( s || "," ) );

}

/**
 * Number formatCurrency(number, locale)
 * @author: dientn
 *
 * @param number
 *            number: number will format
 * @param string
 *            locale: locale will format
 */
exports.formatCurrency = ( number, locale ) =>{
    return ( locale === "vi" ) ? exports.formatNumber( number, 0, 3, ".", "," ) : exports.formatNumber( number, 2, 3, ",", "." );
}
