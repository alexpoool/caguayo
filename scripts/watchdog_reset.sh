# Lo mantiene vivo todo: postgres y la pipeline reanudable.
# Corre en bucle hasta que la pipeline marca etl.hecho y salta EXIT=0.
ROOT=/data/data/com.termux/files/home/caguayo
PGDATA=/data/data/com.termux/files/usr/var/lib/postgresql
LOG=$ROOT/scripts/watchdog_reset.log

echo "== watchdog $(date) ==" >> $LOG
termux-wake-lock 2>/dev/null

while true; do
    if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        echo "postgres caido; arrancando $(date)" >> $LOG
        rm -f $PGDATA/postmaster.pid
        postgres -D $PGDATA >> $PGDATA/server.log 2>&1 &
        sleep 6
    fi
    if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        if bash $ROOT/scripts/reset_y_migrar.sh >> $ROOT/scripts/reset_y_migrar.log 2>&1; then
            echo "pipeline terminar $(date)" >> $LOG
            exit 0
        fi
        echo "pipeline fallo o host corto; reintento en 5s $(date)" >> $LOG
    fi
    sleep 5
done
