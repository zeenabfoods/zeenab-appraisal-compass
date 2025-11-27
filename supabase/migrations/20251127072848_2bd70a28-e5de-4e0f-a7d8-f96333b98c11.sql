-- Add geofence_color column to attendance_branches table
ALTER TABLE attendance_branches 
ADD COLUMN geofence_color TEXT DEFAULT '#FF6B35';

COMMENT ON COLUMN attendance_branches.geofence_color IS 'Hex color code for the branch geofence visualization on maps';