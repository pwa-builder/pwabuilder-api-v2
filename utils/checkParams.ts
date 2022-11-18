import { HttpRequest } from "@azure/functions";

interface IOutputStatus { status: 200 | 400 | 500, body? : { error: { object: Error, message: string | string[] }} };

export function checkParams(req: HttpRequest, params: Array<string>): IOutputStatus {
	const output: IOutputStatus = {
		status: 200
	};

	params.some((param: string) => {
		if (!req?.query || !req.query[param]) {
			output.status = 400;
			const _err = new Error(`Exception - no '${param}' param`);
			output.body = {
				error: { 
					object: _err,
					message: _err.message
				}
			}
			return true;
		}
	});
  
	return output;
}

export function checkBody(req: HttpRequest, params: Array<string>): IOutputStatus {
	const output: IOutputStatus = {
		status: 200
	};

	params.some((param: string) => {
		if (!req?.body || !req.body[param]) {
			output.status = 400;
			const _err = new Error(`Exception - no '${param}' param`);
			output.body = {
				error: { 
					object: _err,
					message: _err.message
				}
			}
			return true;
		}
	});
  
	return output;
}