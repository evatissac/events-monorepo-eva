import { useEffect, useRef } from "react"
import { Bold, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type RichTextEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const hasHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)

export function RichTextEditor({ id, value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editor === document.activeElement) return
    const nextValue = hasHtml(value) ? value : value.replace(/\n/g, "<br>")
    if (editor.innerHTML !== nextValue) editor.innerHTML = nextValue
  }, [value])

  const emitValue = () => onChange(editorRef.current?.innerHTML || "")
  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    emitValue()
  }

  const pastePlainText = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"))
    emitValue()
  }

  const toolClass = "size-8 p-0 text-muted-foreground hover:text-foreground"
  return (
    <div className="rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
        <select aria-label="Formato de párrafo" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)} className="h-8 rounded border border-input bg-background px-2 text-xs">
          <option value="p">Párrafo</option>
          <option value="h2">Título grande</option>
          <option value="h3">Título mediano</option>
          <option value="h4">Título pequeño</option>
        </select>
        <select aria-label="Tamaño de texto" defaultValue="3" onChange={(event) => command("fontSize", event.target.value)} className="h-8 rounded border border-input bg-background px-2 text-xs">
          <option value="2">Pequeño</option>
          <option value="3">Normal</option>
          <option value="4">Grande</option>
          <option value="5">Muy grande</option>
        </select>
        <span className="mx-1 h-5 border-l border-border" />
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Negrita" onClick={() => command("bold")}><Bold className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Cursiva" onClick={() => command("italic")}><Italic className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Subrayado" onClick={() => command("underline")}><Underline className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Tachado" onClick={() => command("strikeThrough")}><Strikethrough className="size-4" /></Button>
        <span className="mx-1 h-5 border-l border-border" />
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Lista con viñetas" onClick={() => command("insertUnorderedList")}><List className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Lista numerada" onClick={() => command("insertOrderedList")}><ListOrdered className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Cita" onClick={() => command("formatBlock", "blockquote")}><Quote className="size-4" /></Button>
        <span className="mx-1 h-5 border-l border-border" />
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Deshacer" onClick={() => command("undo")}><Undo2 className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className={toolClass} title="Rehacer" onClick={() => command("redo")}><Redo2 className="size-4" /></Button>
      </div>
      <div id={id} ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={emitValue} onPaste={pastePlainText} className="min-h-36 px-3 py-2 text-sm text-foreground outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]" />
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Admite texto, títulos, tamaños, negrita, listas y citas. Por seguridad no se permiten enlaces ni imágenes.</p>
    </div>
  )
}
