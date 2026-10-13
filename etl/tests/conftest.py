# -*- coding: utf-8 -*-
"""Los tests del ETL se corren con el pytest del venv del backend:

    cd etl && ../backend/.venv/bin/python -m pytest tests -q

El ETL no tiene entorno propio, pero tampoco venv propio: su único requisito
para estos tests es el que ya está.
"""
import sys
from pathlib import Path

ETL = Path(__file__).resolve().parents[1]
if str(ETL) not in sys.path:
    sys.path.insert(0, str(ETL))