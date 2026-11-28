# Mensajería inteligente para Caguayo

Esta rama implementa el prototipo asociado al Trabajo de Diploma.

## Restricción de hardware

El entorno de desarrollo objetivo dispone de 8 GB de RAM y no tiene GPU.
Por ello la arquitectura se mantiene deliberadamente modular:

- PostgreSQL existente para identidad, permisos, datos y mensajería.
- FastAPI + WebSocket para API y tiempo real.
- Kafka como bus de eventos, ejecutado como un único broker cuando se requiera.
- llama.cpp para inferencia local de modelos cuantizados pequeños (1.5B-3B).
- RAG apoyado inicialmente en PostgreSQL.

## Canales

- person_to_person: mensajería interna tipo correo.
- person_to_agent: conversación con el agente inteligente.

## Desarrollo por fases

1. Contratos, configuración y API inicial.
2. Persistencia PostgreSQL de conversaciones y mensajes.
3. WebSocket y estados de entrega/lectura.
4. Productor/consumidor Kafka reutilizable.
5. Adaptador llama.cpp.
6. RAG y evaluación base vs prompting vs RAG.
7. Pruebas de carga, latencia, throughput, RAM y CPU.
