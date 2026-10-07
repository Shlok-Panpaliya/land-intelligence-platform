# Database

Target: PostgreSQL + PostGIS.

Initial model: district, taluka, village, survey, survey_geometry, survey_record, owner, planning_layer, source_document, source_response.

Sub-survey attributes are stored independently from geometry. Sub-survey geometry is not assumed to exist in the current data source.
