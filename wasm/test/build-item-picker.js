// Shared interaction helper for the visual build catalog.
exports.selectBuildItem=async(page,id)=>{
  const browse=page.getByRole('button',{name:'Browse build items',exact:true});
  if(await browse.isVisible())await browse.click();
  await page.getByRole('textbox',{name:'Search build items',exact:true}).fill('');
  await page.getByRole('button',{name:'All items',exact:true}).click();
  await page.locator(`[data-build-item="${id}"]`).click();
};
