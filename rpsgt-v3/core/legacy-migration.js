(function(global){
  "use strict";
  if(global.RPSGTMigrationEngine){
    global.RPSGTLegacyMigration=global.RPSGTMigrationEngine;
    return;
  }
  global.RPSGTLegacyMigration={
    IMPORT_ENABLED:false,
    buildDraft:function(){
      return {
        status:"blocked",
        canImport:false,
        error:"migration-engine-unavailable",
        validation:{valid:false,passesBlockingValidation:false,blockingCount:1},
        issues:{blocking:[{code:"engine-unavailable",message:"Load core/migration-engine.js before core/legacy-migration.js."}],warnings:[],notices:[]},
        rollback:{protected:true,importEnabled:false,legacyKeysUntouched:true}
      };
    }
  };
})(typeof window!=="undefined"?window:globalThis);
