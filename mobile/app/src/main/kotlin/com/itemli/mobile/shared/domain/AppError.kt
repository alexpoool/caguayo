package com.itemli.mobile.shared.domain

sealed class AppError : Exception() {
    class NoInternet(prefix: String? = null) : AppError()
    object Network : AppError()
    object Timeout : AppError()
    object Auth : AppError()
    data class Api(val code: Int, override val message: String) : AppError()
    object Unknown : AppError()
}
