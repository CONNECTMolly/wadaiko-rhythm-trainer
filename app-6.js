if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
ensureBuiltinRevision();renderSaved();refreshPractice();loadCalibToControls(getCalib());applyCalib(getCalib());updateDisplayTuning();updateEditUI();drawLane()
