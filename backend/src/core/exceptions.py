class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, entity_name: str):
        super().__init__(message=f"{entity_name} no encontrado", status_code=404)


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=422)


class BusinessLogicError(AppError):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=400)
