package com.itemli.mobile.features.auth.domain.valueobjects

/**
 * Token como valor checkbox, no como String suelto por la app.
 */
@JvmInline
value class AuthToken(val value: String)
