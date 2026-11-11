package com.itemli.mobile.shared.infrastructure

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiClientRedactTest {

    @Test
    fun `redacta el bearer token del header Authorization`() {
        val line = "--> GET https://srv/api/v1/reportes h2H \"Authorization: Bearer abc.def.ghi\""
        val out = ApiClient.redact(line)
        assertFalse(out.contains("abc.def.ghi"))
        assertTrue(out.contains("Authorization: Bearer [REDACTED]"))
    }

    @Test
    fun `redacta las credenciales del proxy`() {
        val line = "\"Proxy-Authorization: Basic dXN1cmFpbjpjbGF2Mw==\""
        val out = ApiClient.redact(line)
        assertFalse(out.contains("dXN1cmFpbjpjbGF2Mw=="))
        assertTrue(out.contains("Proxy-Authorization: Basic [REDACTED]"))
    }

    @Test
    fun `redacta parametros de token y password en query`() {
        val line = "https://srv/login?alias=jperez&contrasenia=secret123&token=tok456"
        val out = ApiClient.redact(line)
        assertFalse(out.contains("secret123"))
        assertFalse(out.contains("tok456"))
        assertTrue(out.contains("contrasenia=[REDACTED]"))
        assertTrue(out.contains("token=[REDACTED]"))
    }

    @Test
    fun `no toca datos normales`() {
        val line = "--> GET https://srv/api/v1/reportes/existencias/preview?id_dependencia=1"
        assertTrue(ApiClient.redact(line) == line)
    }
}
