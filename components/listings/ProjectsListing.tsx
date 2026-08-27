import Link from 'next/link';
import { itemHref } from '@/lib/slug';
import MediaAsset from '@/components/ui/MediaAsset';

interface Project {
  id: number;
  title: string;
  slug: string;
  link_url?: string | null;
  excerpt?: string | null;
  thumbnail_url?: string | null;
}

export function ProjectsListing({
  title,
  projects,
}: {
  title: string;
  projects: Project[];
}) {
  return (
    <div className="container body_bg project">
      <div className="title" style={{ marginTop: 24 }}>
        <p>
          <span>{title}</span>
        </p>
      </div>
      {!projects.length ? (
        <p style={{ padding: '24px 0', textAlign: 'center', color: '#666' }}>
          Chưa có dự án nào. Thêm trong Super Admin → Dự án.
        </p>
      ) : (
        <div className="row list_project">
          {projects.map((p) => {
            const href = itemHref(p);
            const external = /^https?:\/\//i.test(href);
            const extProps = external
              ? { target: '_blank', rel: 'noopener noreferrer' as const }
              : {};
            return (
              <div key={p.id} className="col-12 col-md-6 item">
                <dl>
                  <dt>
                    <div className="swing">
                      <figure>
                        <Link href={href} {...extProps}>
                          {p.thumbnail_url && (
                            <MediaAsset src={p.thumbnail_url} alt={p.title} />
                          )}
                        </Link>
                      </figure>
                    </div>
                  </dt>
                  <dd>
                    <h3>
                      <Link href={href} {...extProps}>
                        {p.title}
                      </Link>
                    </h3>
                    {p.excerpt && <p>{p.excerpt}</p>}
                    <Link href={href} {...extProps} />
                  </dd>
                  <div className="clearfix" />
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
