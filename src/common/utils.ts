import _ from "lodash"
import fs from 'fs-extra'
import { ImportContext } from "../handlers/resource-handler"
import { compile as handlebarsCompile } from 'handlebars';

export const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

export type AnnotatedFile = {
    path: string
    object: any
}

export const fileIterator = (dir: any, context: ImportContext) => {
    return {
        iterate: async (fn: (file: AnnotatedFile) => Promise<any>): Promise<any[]> => {
            let files = _.reject(fs.readdirSync(dir), dir => dir.startsWith('.'))
            return _.compact(_.flatten(await Promise.all(files.map(async file => {
                let path = `${dir}/${file}`
                let stats = fs.statSync(path)

                if (stats.isDirectory()) {
                    return await fileIterator(path, context).iterate(fn)
                }
                else {
                    let contents: any = {}
                    if (path.endsWith('.hbs')) {
                        let fileContents = fs.readFileSync(path, 'utf-8')
                        const template = handlebarsCompile(fileContents)
                        contents = JSON.parse(template(context.mapping))
    
                        // delete the hbs template
                        fs.unlinkSync(path)
    
                        // update the path and write the json to file
                        path = path.replace('.hbs', '')
    
                        fs.writeJsonSync(path, contents)
                    }
                    else {
                        contents = fs.readJsonSync(path)
                    }
    
                    let schemaId = contents.body?._meta?.schema || 
                        contents.schemaId || 
                        contents['$id'] || 
                        contents.contentTypeUri

                    if (!_.isEmpty(schemaId) && !_.isEmpty(context.matchingSchema) && 
                        !_.includes(context.matchingSchema, schemaId)) {
                        fs.unlinkSync(path)
                    }
    
                    return await fn({
                        path,
                        object: contents
                    })
                }
            }))))
        }
    }
}