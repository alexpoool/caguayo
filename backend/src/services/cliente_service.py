from typing import List, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import or_, text
from sqlalchemy.orm import selectinload
from src.repository.cliente_repo import (
    cliente_repo,
    cliente_natural_repo,
    cliente_juridica_repo,
    cliente_tcp_repo,
    tipo_entidad_repo,
    cuenta_repo,
)
from src.models import Cliente
from src.dto import (
    ClienteCreate,
    ClienteRead,
    ClienteUpdate,
    ClienteNaturalCreate,
    ClienteNaturalRead,
    ClienteNaturalUpdate,
    ClienteJuridicaCreate,
    ClienteJuridicaRead,
    ClienteJuridicaUpdate,
    ClienteTCPCreate,
    ClienteTCPRead,
    ClienteTCPUpdate,
    TipoEntidadCreate,
    TipoEntidadRead,
    TipoEntidadUpdate,
    CuentaCreate,
    CuentaRead,
    CuentaUpdate,
)

PERSON_TYPES = {"NATURAL", "TCP", "JURIDICA"}


class ClienteConReferenciasError(Exception):
    """El tercero tiene registros asociados que impiden su eliminación."""

    def __init__(self, referencias: list[str]):
        self.referencias = referencias
        super().__init__(
            "No se puede eliminar: tiene "
            + ", ".join(referencias)
            + " asociados. Elimine primero esos registros."
        )


def _sanitize_search(search: str) -> str:
    """Escapa los comodines de LIKE para buscar el texto literal."""
    return search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _aplicar_filtros(statement, tipo_relacion=None, search=None):
    """Aplica los filtros de listado y conteo con el mismo WHERE."""
    if tipo_relacion:
        # Soportar valores separados por coma (ej. "PROVEEDOR,AMBAS").
        tipos = [t.strip() for t in tipo_relacion.split(",") if t.strip()]
        if tipos and set(tipos).issubset(PERSON_TYPES):
            statement = statement.where(Cliente.tipo_persona.in_(tipos))
        elif len(tipos) == 1:
            statement = statement.where(Cliente.tipo_relacion == tipos[0])
        elif len(tipos) > 1:
            statement = statement.where(Cliente.tipo_relacion.in_(tipos))

    if search and search.strip():
        patron = f"%{_sanitize_search(search.strip())}%"
        statement = statement.where(
            or_(
                Cliente.codigo.ilike(patron),
                Cliente.nombre.ilike(patron),
                Cliente.nit.ilike(patron),
                Cliente.telefono.ilike(patron),
                Cliente.email.ilike(patron),
            )
        )

    return statement


class ClienteService:
    @staticmethod
    async def create_cliente(db: AsyncSession, cliente: ClienteCreate) -> ClienteRead:
        from sqlmodel import select
        from sqlalchemy.orm import selectinload
        from src.models.cliente_natural import ClienteNatural
        from src.models.cliente_juridica import ClienteJuridica
        from src.models.cliente_tcp import ClienteTCP

        async with db.begin():
            # Convert DTO to dict, excluding specific subtypes
            obj_data = cliente.model_dump(
                exclude={
                    "cliente_natural",
                    "cliente_juridica",
                    "cliente_tcp",
                    "cuentas",
                }
            )
            db_cliente = Cliente(**obj_data)
            db.add(db_cliente)
            await db.flush()  # Gets the id_cliente without finalizing transaction

            tipo = cliente.tipo_persona
            if tipo == "NATURAL" and cliente.cliente_natural:
                nat_data = cliente.cliente_natural.model_dump()
                nat_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteNatural(**nat_data))
            elif tipo == "JURIDICA" and cliente.cliente_juridica:
                jur_data = cliente.cliente_juridica.model_dump()
                jur_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteJuridica(**jur_data))
            elif tipo == "TCP" and cliente.cliente_tcp:
                tcp_data = cliente.cliente_tcp.model_dump()
                tcp_data["id_cliente"] = db_cliente.id_cliente
                db.add(ClienteTCP(**tcp_data))

            # Crear cuentas asociadas si se proporcionaron
            if cliente.cuentas:
                from src.models.cuenta import Cuenta

                for cuenta_data in cliente.cuentas:
                    cuenta_dict = cuenta_data.model_dump()
                    cuenta_dict["id_cliente"] = db_cliente.id_cliente
                    db_cuenta = Cuenta(**cuenta_dict)
                    db.add(db_cuenta)

            await db.flush()

        # Load relationships explicitly (populate_existing forces SA to
        # ignore identity map and apply selectinload eagerly)
        result = await db.exec(
            select(Cliente)
            .where(Cliente.id_cliente == db_cliente.id_cliente)
            .options(
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
            )
            .execution_options(populate_existing=True)
        )
        db_cliente = result.one()
        return ClienteRead.model_validate(db_cliente)

    @staticmethod
    async def get_cliente(db: AsyncSession, cliente_id: int) -> Optional[ClienteRead]:
        db_cliente = await cliente_repo.get(
            db,
            id=cliente_id,
            load_options=[
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
            ],
        )
        return ClienteRead.model_validate(db_cliente) if db_cliente else None

    @staticmethod
    async def get_clientes(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10000,
        tipo_relacion: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[ClienteRead]:

        statement = select(Cliente).options(
            selectinload(Cliente.provincia),
            selectinload(Cliente.municipio),
            selectinload(Cliente.cuentas),
            selectinload(Cliente.cliente_natural),
            selectinload(Cliente.cliente_juridica),
            selectinload(Cliente.cliente_tcp),
        )

        statement = _aplicar_filtros(
            statement, tipo_relacion=tipo_relacion, search=search
        )

        statement = statement.order_by(Cliente.id_cliente.desc()).offset(skip).limit(limit)
        results = await db.exec(statement)
        db_clientes = list(results.all())

        return [ClienteRead.model_validate(c) for c in db_clientes]

    @staticmethod
    async def count_clientes(
        db: AsyncSession,
        tipo_relacion: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        """Total con el mismo WHERE que get_clientes (header X-Total-Count)."""
        from sqlalchemy import func

        statement = select(func.count()).select_from(Cliente)
        statement = _aplicar_filtros(
            statement, tipo_relacion=tipo_relacion, search=search
        )
        result = await db.exec(statement)
        return result.one()

    @staticmethod
    async def update_cliente(
        db: AsyncSession, cliente_id: int, cliente_update: ClienteUpdate
    ) -> Optional[ClienteRead]:
        from src.models.cuenta import Cuenta

        db_cliente = await cliente_repo.get(db, id=cliente_id)
        if not db_cliente:
            return None

        # Detectar si es dict u objeto Pydantic
        if isinstance(cliente_update, dict):
            cuentas_data = cliente_update.get("cuentas")
            update_data = {
                k: v
                for k, v in cliente_update.items()
                if k
                not in ("cuentas", "cliente_natural", "cliente_juridica", "cliente_tcp")
                and v is not None
            }
        else:
            cuentas_data = cliente_update.cuentas
            update_data = cliente_update.model_dump(
                exclude={
                    "cuentas",
                    "cliente_natural",
                    "cliente_juridica",
                    "cliente_tcp",
                },
                exclude_none=True,
            )

        # Update manual de campos (evitar usar repo.update con dict)
        tipo_persona_anterior = db_cliente.tipo_persona
        for field, value in update_data.items():
            setattr(db_cliente, field, value)
        await db.flush()

        # --- Procesar datos tipo-específicos ---
        from src.models.cliente_natural import ClienteNatural
        from src.models.cliente_juridica import ClienteJuridica
        from src.models.cliente_tcp import ClienteTCP
        from src.utils.validacion_migracion import correccion_valida, valor_actual

        tipo = update_data.get("tipo_persona") or db_cliente.tipo_persona

        if isinstance(cliente_update, dict):
            cliente_natural_data = cliente_update.get("cliente_natural")
            cliente_juridica_data = cliente_update.get("cliente_juridica")
            cliente_tcp_data = cliente_update.get("cliente_tcp")
        else:
            cliente_natural_data = cliente_update.cliente_natural
            cliente_juridica_data = cliente_update.cliente_juridica
            cliente_tcp_data = cliente_update.cliente_tcp

        # Guardar el valor del campo marcado antes de que se reescriba la fila,
        # para poder decidir si la marca se retira tras la actualización.
        campo_marcado = db_cliente.campo
        valor_antes = (
            await valor_actual(db, cliente_id, campo_marcado) if campo_marcado else None
        )

        # Sólo se reemplaza la fila tipo-específica cuyo payload viene informado.
        # Antes se borraban todas y, si el payload no traía los datos de la
        # persona, se perdían al guardar cualquier otro campo del registro.
        especialidad_antes = await db.execute(
            text("SELECT id_especialidad FROM clientes_persona_natural"
                 " WHERE id_cliente = :id"),
            {"id": cliente_id},
        )
        especialidad_previa = especialidad_antes.scalar()

        datos_por_tipo = {
            "NATURAL": cliente_natural_data,
            "JURIDICA": cliente_juridica_data,
            "TCP": cliente_tcp_data,
        }
        datos_tipo = datos_por_tipo.get(tipo)

        if (
            "tipo_persona" in update_data
            and tipo != tipo_persona_anterior
            and not datos_tipo
        ):
            raise ValueError("Debe enviar los datos del nuevo tipo de persona")

        if datos_tipo:
            # Si cambió el tipo de persona no deben quedar filas huérfanas del
            # tipo anterior; si no cambió, se reemplaza sólo la fila actual.
            for tabla in (
                "clientes_persona_natural",
                "clientes_persona_juridica",
                "cliente_tcp",
            ):
                await db.execute(
                    text(f"DELETE FROM {tabla} WHERE id_cliente = :id"),
                    {"id": cliente_id},
                )

            if tipo == "NATURAL":
                nat_dict = (
                    cliente_natural_data
                    if isinstance(cliente_natural_data, dict)
                    else cliente_natural_data.model_dump()
                )
                nat_dict["id_cliente"] = cliente_id
                if nat_dict.get("id_especialidad") is None:
                    nat_dict["id_especialidad"] = especialidad_previa
                db.add(ClienteNatural(**nat_dict))
            elif tipo == "JURIDICA":
                jur_dict = (
                    cliente_juridica_data
                    if isinstance(cliente_juridica_data, dict)
                    else cliente_juridica_data.model_dump()
                )
                jur_dict["id_cliente"] = cliente_id
                db.add(ClienteJuridica(**jur_dict))
            elif tipo == "TCP":
                tcp_dict = (
                    cliente_tcp_data
                    if isinstance(cliente_tcp_data, dict)
                    else cliente_tcp_data.model_dump()
                )
                tcp_dict["id_cliente"] = cliente_id
                db.add(ClienteTCP(**tcp_dict))

        await db.flush()

        # --- Retirar la marca de datos migrados si el campo ya está correcto ---
        if campo_marcado:
            valor_despues = await valor_actual(db, cliente_id, campo_marcado)
            if correccion_valida(campo_marcado, valor_antes, valor_despues):
                db_cliente.valido = True
                db_cliente.campo = None
                db_cliente.razon = None
                await db.flush()

        # --- Procesar cuentas bancarias ---

        if cuentas_data is not None:
            # Eliminar cuentas existentes para evitar duplicados
            existing_cuentas = await db.exec(
                select(Cuenta).where(Cuenta.id_cliente == cliente_id)
            )
            for c in existing_cuentas.all():
                await db.delete(c)

            # Re-insertar todas las cuentas del payload
            for cuenta_dict in cuentas_data:
                if isinstance(cuenta_dict, dict):
                    cuenta_clean = {
                        k: v for k, v in cuenta_dict.items() if v is not None
                    }
                else:
                    cuenta_clean = cuenta_dict.model_dump(exclude_none=True)

                cuenta_clean = {
                    k: v
                    for k, v in cuenta_clean.items()
                    if k
                    in (
                        "titular",
                        "banco",
                        "sucursal",
                        "numero_cuenta",
                        "direccion",
                        "id_moneda",
                        "id_cliente",
                    )
                }
                cuenta_clean["id_cliente"] = cliente_id
                db.add(Cuenta(**cuenta_clean))

            await db.flush()

        # Commit all changes
        await db.commit()

        # Cargar relaciones para retornar
        result = await db.exec(
            select(Cliente)
            .where(Cliente.id_cliente == cliente_id)
            .options(
                selectinload(Cliente.cliente_natural),
                selectinload(Cliente.cliente_juridica),
                selectinload(Cliente.cliente_tcp),
                selectinload(Cliente.provincia),
                selectinload(Cliente.municipio),
                selectinload(Cliente.cuentas),
            )
            .execution_options(populate_existing=True)
        )
        updated_cliente = result.one()
        return ClienteRead.model_validate(updated_cliente)

    @staticmethod
    async def delete_cliente(db: AsyncSession, cliente_id: int) -> bool:
        db_cliente = await cliente_repo.get(db, id=cliente_id)
        if not db_cliente:
            return False

        # Tablas con FK sin CASCADE: si hay registros de negocio se bloquea el
        # borrado con un mensaje claro en lugar de un error de integridad.
        referencias = (
            ("movimientos", "SELECT COUNT(*) FROM movimiento WHERE id_cliente = :id"),
            (
                "liquidaciones",
                "SELECT COUNT(*) FROM liquidacion WHERE id_cliente = :id",
            ),
            (
                "productos en liquidaciones",
                "SELECT COUNT(*) FROM productos_en_liquidacion WHERE id_cliente = :id",
            ),
            (
                "solicitudes de servicio",
                "SELECT COUNT(*) FROM solicitud_servicio WHERE id_cliente = :id",
            ),
            (
                "personas en etapas",
                "SELECT COUNT(*) FROM persona_etapa WHERE id_persona = :id",
            ),
            (
                "personas en liquidaciones",
                "SELECT COUNT(*) FROM persona_liquidacion WHERE id_persona = :id",
            ),
        )
        encontradas = []
        for nombre, consulta in referencias:
            total = (
                await db.execute(text(consulta), {"id": cliente_id})
            ).scalar() or 0
            if total:
                encontradas.append(nombre)
        if encontradas:
            raise ClienteConReferenciasError(encontradas)

        # Datos propios del tercero: sus FK no tienen CASCADE, así que se
        # eliminan antes que la fila principal.
        for tabla in (
            "clientes_persona_natural",
            "clientes_persona_juridica",
            "cliente_tcp",
            "cuenta",
        ):
            await db.execute(
                text(f"DELETE FROM {tabla} WHERE id_cliente = :id"),
                {"id": cliente_id},
            )

        await db.execute(
            text("DELETE FROM clientes WHERE id_cliente = :id"), {"id": cliente_id}
        )
        await db.commit()
        return True


class ClienteNaturalService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_natural: ClienteNaturalCreate
    ) -> ClienteNaturalRead:
        db_obj = await cliente_natural_repo.create(db, obj_in=cliente_natural)
        return ClienteNaturalRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteNaturalRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteNaturalUpdate
    ) -> Optional[ClienteNaturalRead]:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_natural_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteNaturalRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_natural_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_natural_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteJuridicaService:
    @staticmethod
    async def create(
        db: AsyncSession, cliente_juridica: ClienteJuridicaCreate
    ) -> ClienteJuridicaRead:
        db_obj = await cliente_juridica_repo.create(db, obj_in=cliente_juridica)
        return ClienteJuridicaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteJuridicaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ClienteJuridicaRead]:
        from src.models.cliente_juridica import ClienteJuridica

        db_objs = await cliente_juridica_repo.get_multi(
            db,
            skip=skip,
            limit=limit,
            load_options=[selectinload(ClienteJuridica.tipo_entidad)],
        )
        return [ClienteJuridicaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteJuridicaUpdate
    ) -> Optional[ClienteJuridicaRead]:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_juridica_repo.update(
            db, db_obj=db_obj, obj_in=update_data
        )
        return ClienteJuridicaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_juridica_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_juridica_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class ClienteTCPService:
    @staticmethod
    async def create(db: AsyncSession, cliente_tcp: ClienteTCPCreate) -> ClienteTCPRead:
        db_obj = await cliente_tcp_repo.create(db, obj_in=cliente_tcp)
        return ClienteTCPRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id_cliente: int) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        return ClienteTCPRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def update(
        db: AsyncSession, id_cliente: int, update_data: ClienteTCPUpdate
    ) -> Optional[ClienteTCPRead]:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if not db_obj:
            return None
        updated = await cliente_tcp_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return ClienteTCPRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id_cliente: int) -> bool:
        db_obj = await cliente_tcp_repo.get_with_cliente(db, id_cliente=id_cliente)
        if db_obj:
            await cliente_tcp_repo.remove(db, id=db_obj.id_cliente)
            return True
        return False


class TipoEntidadService:
    @staticmethod
    async def create(
        db: AsyncSession, tipo_entidad: TipoEntidadCreate
    ) -> TipoEntidadRead:
        db_obj = await tipo_entidad_repo.create(db, obj_in=tipo_entidad)
        return TipoEntidadRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        return TipoEntidadRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(db: AsyncSession) -> List[TipoEntidadRead]:
        db_objs = await tipo_entidad_repo.get_all(db)
        return [TipoEntidadRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: TipoEntidadUpdate
    ) -> Optional[TipoEntidadRead]:
        db_obj = await tipo_entidad_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await tipo_entidad_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return TipoEntidadRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await tipo_entidad_repo.remove(db, id=id)
        return db_obj is not None


class CuentaService:
    @staticmethod
    async def create(db: AsyncSession, cuenta: CuentaCreate) -> CuentaRead:
        db_obj = await cuenta_repo.create(db, obj_in=cuenta)
        return CuentaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get_with_relations(db, id=id)
        return CuentaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_multi(db, skip=skip, limit=limit)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def get_by_cliente(db: AsyncSession, id_cliente: int) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_by_cliente(db, id_cliente=id_cliente)
        return [CuentaRead.model_validate(o) for o in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, update_data: CuentaUpdate
    ) -> Optional[CuentaRead]:
        db_obj = await cuenta_repo.get(db, id=id)
        if not db_obj:
            return None
        updated = await cuenta_repo.update(db, db_obj=db_obj, obj_in=update_data)
        return CuentaRead.model_validate(updated)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        db_obj = await cuenta_repo.remove(db, id=id)
        return db_obj is not None
