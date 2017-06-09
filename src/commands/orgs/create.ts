import { Command, CommandResult, help, success, failure, ErrorCodes, shortName, longName, hasArg, required } from "../../util/commandline";
import { out } from "../../util/interaction";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:orgs:create");
import { inspect } from "util";
import { getPortalOrgLink } from "../../util/portal/portal-helper";
import { getOrgUsers, pickAdmins } from "./lib/org-users-helper";

@help("Create a new organization")
export default class OrgCreateCommand extends Command {
  @help("Name of the organization")
  @shortName("n")
  @longName("name")
  @required
  @hasArg
  name: string;

  @help("Display name of the organization")
  @shortName("d")
  @longName("display-name")
  @hasArg
  displayName: string;

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    
    let organizationInfo: models.OrganizationResponse;
    try {
      const httpResponse = await out.progress("Creating new organization...", clientRequest<models.OrganizationResponse>((cb) => client.organization.createOrUpdate({
        displayName: this.displayName,
        name: this.name
      }, cb)));
      if (httpResponse.response.statusCode < 400) {
        organizationInfo = httpResponse.result;        
      } else {
        throw httpResponse.response;
      }
    } catch (error) {
      if (error.statusCode === 409) {
        return failure(ErrorCodes.InvalidParameter, `organization ${this.name} already exists`);
      } else {
        debug(`Failed to create organization - ${inspect(error)}`);
        return failure(ErrorCodes.Exception, "failed to create organization");
      }
    }

    const admins: models.OrganizationUserResponse[] = pickAdmins(await getOrgUsers(client, organizationInfo.name, debug));

    out.text(`Successfully created organization ${this.name}`);
    out.report([
      ["Name", "name"],
      ["Display name", "displayName"],
      ["URL", "url"],
      ["Admins", "admins", (adminsArray: models.OrganizationUserResponse[]) => adminsArray.map((admin) => admin.name).join(", ")]
    ], { name: this.name, displayName: this.displayName, url: getPortalOrgLink(portalBaseUrl, this.name), admins});

    return success();
  }
}
