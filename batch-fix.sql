-- Batch fix for pending bets
DO $$
DECLARE
    batch_size INT := 10;
    updated_count INT := 0;
    total_updated INT := 0;
BEGIN
    LOOP
        -- Update a small batch
        WITH batch AS (
            SELECT id 
            FROM bets 
            WHERE outcome = 'pending' 
            LIMIT batch_size
        )
        UPDATE bets 
        SET outcome = 'cancelled'
        WHERE id IN (SELECT id FROM batch);
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        -- Exit if no more rows to update
        IF updated_count = 0 THEN
            EXIT;
        END IF;
        
        total_updated := total_updated + updated_count;
        RAISE NOTICE 'Updated batch: % rows, total: %', updated_count, total_updated;
        
        -- Small delay to avoid overwhelming the database
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Total bets cancelled: %', total_updated;
END $$; 