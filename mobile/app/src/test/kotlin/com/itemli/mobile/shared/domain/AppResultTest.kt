package com.itemli.mobile.shared.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AppResultTest {

    @Test
    fun successMapsValue() {
        val mapped = (AppResult.Success(1) as AppResult<Int>).map { it + 1 }
        assertEquals(2, (mapped as AppResult.Success).value)
    }

    @Test
    fun failurePropagatesUnchanged() {
        val failure: AppResult<Int> = AppResult.Failure(RuntimeException("boom"))
        val mapped = failure.map { it + 1 }
        assertTrue(mapped is AppResult.Failure)
    }
}
