package com.itemli.mobile.features.reports.infrastructure.local

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

/**
 * Codec JSON para las filas y totales genéricos de un preview.
 * Los valores admitidos son String, numéricos, Boolean y null; cualquier otro
 * tipo se serializa como String para no perder información.
 */
internal object ReportPreviewJson {

    private val json = Json { encodeDefaults = true }

    fun encodeRows(rows: List<Map<String, Any?>>): String =
        JsonArray(rows.map { row -> encodeMap(row) }).toString()

    fun decodeRows(text: String): List<Map<String, Any?>> =
        decode(text) { element -> (element as? JsonArray)?.map { decodeMap(it) } } ?: emptyList()

    fun encodeTotals(totals: Map<String, Any?>): String = encodeMap(totals).toString()

    fun decodeTotals(text: String): Map<String, Any?> =
        decode(text) { element -> decodeMap(element) } ?: emptyMap()

    private fun encodeMap(map: Map<String, Any?>): JsonObject = JsonObject(
        map.mapValues { (_, value) -> encodeValue(value) },
    )

    private fun decodeMap(element: JsonElement): Map<String, Any?> =
        (element as? JsonObject)?.mapValues { (_, value) -> decodeValue(value) } ?: emptyMap()

    private fun encodeValue(value: Any?): JsonElement = when (value) {
        null -> JsonNull
        is String -> JsonPrimitive(value)
        is Boolean -> JsonPrimitive(value)
        is Int, is Long -> JsonPrimitive((value as Number).toLong())
        is Double, is Float -> JsonPrimitive((value as Number).toDouble())
        is Number -> JsonPrimitive(value.toLong())
        else -> JsonPrimitive(value.toString())
    }

    private fun decodeValue(element: JsonElement): Any? = when {
        element is JsonNull -> null
        element is JsonPrimitive && element.isString -> element.content
        element is JsonPrimitive && element.booleanOrNull != null -> element.booleanOrNull
        element is JsonPrimitive && element.longOrNull != null -> element.longOrNull
        element is JsonPrimitive && element.doubleOrNull != null -> element.doubleOrNull
        else -> null
    }

    private inline fun <T> decode(text: String, transform: (JsonElement) -> T): T? =
        runCatching { transform(json.parseToJsonElement(text)) }.getOrNull()
}
