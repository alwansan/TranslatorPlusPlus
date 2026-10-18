// add handler into BatchTranslation
const thisAddon = this;
if (BatchTranslate) {
    BatchTranslate.addBeforeTranslateCommonRoutine("tm", async function (batch) {
        console.log("tmUtils passed batch", batch);
        for (let i = 0; i < batch.length; i++) {
            let item = batch[i];
            const translation = await thisAddon.handler.remindMe(item.original); 
            if (!translation?.[0]) continue;

            item.translation = translation[0];
        }

        console.log("%cBatchTranslate.beforeTranslateCommonRoutines", "color: yellow", batch);
        return batch;
    });
}