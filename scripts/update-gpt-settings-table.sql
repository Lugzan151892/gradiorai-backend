/** npx prisma db execute --file update-gpt-settings-table.sql */

ALTER TABLE GptSettings
ADD COLUMN type VARCHAR(255);

UPDATE GptSettings
SET type = 'TEST';

ALTER TABLE GptSettings
ADD UNIQUE KEY unique_type (type);