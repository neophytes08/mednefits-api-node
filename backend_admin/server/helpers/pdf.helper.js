const fs = require('fs');
const Promise = require('bluebird');
const pdf = Promise.promisifyAll(require('html-pdf'));
const handlebars = require('handlebars');

const processPdf = async (data, res) => {
	// console.log('data', data)
	// var options = {
	// 	format: "A4",
	// 	orientation: "portrait",
	// 	border: "0mm",
	// 	zoomFactor: "1",
	// };

	var html = await fs.readFileSync(app_root + '/pdf/' + data.pdf_page, 'utf8');
	// console.log('html', html)
	var document = await {
		type: 'buffer',
		template: html,
		context: data.context
	};

	// console.log('document', document);

	var template = await handlebars.compile(html)(document.context);
	var createResult = await pdf.create(template, data.options);
	var pdfToFile = await Promise.promisify(createResult.__proto__.toStream, { context: createResult });
	return pdfToFile();
	// return await pdf.createAsync(template, { filename: 'something.pdf'}).toBuffer();
	// await pdf.create(template, data.options).toBuffer();
}
module.exports = {
    processPdf
};