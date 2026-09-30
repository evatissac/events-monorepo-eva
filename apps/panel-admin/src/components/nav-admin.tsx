import { ChevronRight } from "lucide-react"
import { useLocation, Link } from "react-router-dom"
import { cn } from "@/lib/utils"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

import { type AdminRouteItem } from "@/config/admin-routes"

export function NavAdmin({
    items,
    label = "Menú",
}: {
    items: AdminRouteItem[]
    label?: string
}) {
    const { pathname } = useLocation()
    const matchesRoute = (url: string) => pathname === url || pathname.startsWith(`${url}/`)

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground px-3 py-2 uppercase tracking-wider">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isDashboard = item.url === '/dashboard'
                    const isActive = isDashboard ? pathname === item.url : matchesRoute(item.url)

                    if (item.items && item.items.length > 0) {
                        const activeSubUrl = item.items
                            .filter(sub => matchesRoute(sub.url))
                            .sort((a, b) => b.url.length - a.url.length)[0]?.url
                        const isSubActive = Boolean(activeSubUrl)

                        return (
                            <Collapsible
                                key={item.title}
                                defaultOpen={isSubActive || isActive}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={false}
                                            className={cn(
                                                "w-full justify-between hover:bg-muted/50 rounded-md transition-colors",
                                                (isActive || isSubActive) ? "text-primary font-semibold" : "text-sidebar-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon && (
                                                    <item.icon
                                                        className={cn(
                                                            "size-4 transition-colors",
                                                            (isActive || isSubActive) ? "text-primary" : "text-muted-foreground group-hover/menu-button:text-sidebar-foreground"
                                                        )}
                                                    />
                                                )}
                                                <span className="text-sm font-medium">{item.title}</span>
                                            </div>
                                            <ChevronRight className={cn(
                                                "size-4 ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90",
                                                (isActive || isSubActive) ? "text-primary" : "text-muted-foreground"
                                            )} />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="border-l border-border/80 ml-4 pl-2 my-1 space-y-1">
                                            {item.items.map((subItem) => {
                                                const isChildActive = subItem.url === activeSubUrl
                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton
                                                            isActive={isChildActive}
                                                            asChild
                                                            className={cn(
                                                                "w-full text-left !bg-transparent hover:!bg-muted/50 rounded-md transition-colors px-3 py-1.5 data-[active=true]:!bg-sidebar-accent",
                                                                isChildActive ? "text-primary font-semibold" : "text-sidebar-foreground"
                                                            )}
                                                        >
                                                            <Link to={subItem.url} className="w-full block">
                                                                <span className="text-xs font-medium">{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                )
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        )
                    }
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                isActive={false}
                                asChild
                                className={cn(
                                    "hover:bg-muted/50 rounded-md transition-colors",
                                    isActive ? "text-primary font-semibold" : "text-sidebar-foreground"
                                )}
                                style={{
                                    backgroundColor: "transparent"
                                }}
                            >
                                <Link to={item.url} className="flex items-center gap-3 w-full">
                                    {item.icon && (
                                        <item.icon
                                            className={cn(
                                                "size-4 transition-colors",
                                                isActive ? "text-primary" : "text-muted-foreground group-hover/menu-button:text-sidebar-foreground"
                                            )}
                                        />
                                    )}
                                    <span className={cn("text-sm", isActive ? "text-primary  font-bold" : "text-sidebar-foreground")}>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
