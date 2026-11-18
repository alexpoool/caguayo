package com.itemli.mobile.features.reports.infrastructure.datasources

import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Query

/** Catálogos reales usados por los selectores de filtros. */
interface ReportFilterOptionsApi {
    @GET("dependencias")
    suspend fun dependencies(): List<DependencyOptionDto>

    @GET("dependencias/ubicaciones/provincias")
    suspend fun provinces(): List<ProvinceOptionDto>

    @GET("dependencias/ubicaciones/municipios")
    suspend fun municipalities(@Query("provincia_id") provinceId: Long? = null): List<MunicipalityOptionDto>

    @GET("monedas")
    suspend fun currencies(): List<CurrencyOptionDto>

    @GET("reportes/personas")
    suspend fun people(): List<PersonOptionDto>

    @GET("reportes/productos-item-anexo")
    suspend fun products(): List<ProductOptionDto>
}

@Serializable
data class DependencyOptionDto(val id_dependencia: Long, val nombre: String)

@Serializable
data class ProvinceOptionDto(val id_provincia: Long, val nombre: String)

@Serializable
data class MunicipalityOptionDto(val id_municipio: Long, val nombre: String)

@Serializable
data class CurrencyOptionDto(
    val id_moneda: Long,
    val nombre: String,
    val simbolo: String = "",
)

@Serializable
data class PersonOptionDto(val id_persona: Long, val nombre: String)

@Serializable
data class ProductOptionDto(
    val id_producto: Long,
    val nombre: String,
    val codigo: String = "",
)

data class ReportFilterOption(val value: String, val label: String)
